import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import moment from 'moment-timezone';
import { getRoutedWorkOrders, getAcceptRoutedWorkOrderPayload, acceptRoutedWorkOrder } from '../utils/cronHelpers/routedWorkOrdersHelper.js';
import { getWorkOrderRequestValidation, logWorkOrderOperation, requestWorkOrders, counterOfferWorkOrders } from '../utils/cronHelpers/commonWorkOrdersHelper.js';
import { getCounterOfferNote, getPaymentCounterOfferRequestPayload, getScheduleCounterOfferRequestPayload } from '../utils/cronHelpers/counterOfferHelper.js';

// Will run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    if (process.env.DISABLED_CRONS === 'true') {
        return;
    }
    const cronName = 'routedWorkOrders';
    logger.info(`Cron job '${cronName}' started.`, {cron: cronName});
    const userService = new UserService();
    const users = await userService.fetchAllUsers();

    const adminAccessToken = await userService.getServiceCompanyAdminAccessToken();
    if (!adminAccessToken) {
        logger.error(`Service company admin is not integrated with Field Nation, routed work order request cron running failed`, {cron: cronName});
        return;
    }

    const userPromises = users.map(async (user) => {
        // silently avoid, blocked and inactive users
        if (user.blocked || !user.isActive) {
            return;
        }

        // checking integration with Field Nation
        const integrationService = new IntegrationService(user.userId);
        const integration = await integrationService.fetchIntegration();
        if (!integration || !integration.fnUserId || integration.integrationStatus == 'Not Connected' || integration.disabled) {
            // logger.info(`User id: ${user.userId} is not integrated with Field Nation`, {cron: cronName});
            return;
        }

        // checking configured crons
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchAllCrons();
        if (crons && !crons.length) {
            // logger.info(`User id: ${user.userId} has no cron configured`, {cron: cronName});
            return;
        }

        const cronPromises = crons.map(async (cron) => {
            const locationRadius = cron.drivingRadius > 1 ? cron.drivingRadius : 50;
            const currentDateTime = moment.utc().toDate();
            const cronStartAt = moment.utc(cron.cronStartAt).toDate();
            const cronEndAt = moment.utc(cron.cronEndAt).toDate();
            const cronCenterZip = cron.centerZip ? cron.centerZip : '';
            const withinCronContractTime = (currentDateTime >= cronStartAt && currentDateTime <= cronEndAt);

            // silently avoid, if a cron is not active or deleted or cron contract ended
            if (cron.status == 'inactive' || cron.deleted || !withinCronContractTime) {
                return;
            }

            // check if cron has configured types of work orders
            if (!cron.typesOfWorkOrder.length) {
                // logger.info(`Cron id: ${cron.cronId} has no configured types of work order`, {cron: cronName});
                return;
            }

            const typeOfWorkQueryParams = cron.typesOfWorkOrder
                .map(typeId => `&f_type_of_work[]=${encodeURIComponent(typeId)}`)
                .join('');

            // Get routed work orders
            const workOrdersResponse = await getRoutedWorkOrders(user.userId, integration.fnUserId, cronCenterZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);

            if (workOrdersResponse && workOrdersResponse.results) {
                await workOrdersResponse.results.reduce(async (previousPromise, workOrder) => {
                    await previousPromise;
                
                    // TODO: Remove DEBUG Code
                    // if (workOrder.id === 39913) {
                    //     return;
                    // }
                    const allowedPaymentType = (workOrder.pay.type === 'fixed' && cron.isFixed) || (workOrder.pay.type === 'hourly' && cron.isHourly) || (workOrder.pay.type === 'device' && cron.isPerDevice) || (workOrder.pay.type === 'blended' && cron.isBlended);
                    if (!allowedPaymentType) {
                        logger.info(`Payment type ${workOrder.pay.type} is not allowed, work order #${workOrder.id}, cron id: ${cron.cronId}`, { cron: cronName });
                        return;
                    }
                    await logWorkOrderOperation(`Found work order #${workOrder.id}, Title: ${workOrder.title}`, workOrder, {}, cronName);

                    const workOrderRequestValidation = await getWorkOrderRequestValidation(workOrder, cron);
                    logger.info(
                        `Payment & schedule validation for work order #${workOrder.id} - Payment valid: ${workOrderRequestValidation.isPaymentValid}, Schedule valid: ${workOrderRequestValidation.isScheduleValid}`,
                        { ...workOrderRequestValidation, cron: cronName }
                    );

                    if (workOrderRequestValidation.isValid && workOrder.status.name === 'Routed') {
                        await logWorkOrderOperation(`Initiating acceptance process for work order #${workOrder.id}`, workOrder, {}, cronName);
                        const acceptRoutedWorkOrderPayload = await getAcceptRoutedWorkOrderPayload(workOrder, integration.fnUserId);
                        // TODO: Enable when actually want to accept routed workorders
                        // await acceptRoutedWorkOrder(workOrder.id, cron.cronId, user.userId, integration.fnUserId, acceptRoutedWorkOrderPayload, adminAccessToken);
                    }

                    if (!workOrderRequestValidation.isValid && cron.isEnabledCounterOffer) {
                        const counterOfferNote = await getCounterOfferNote(workOrderRequestValidation.isPaymentValid, workOrderRequestValidation.isScheduleValid, cron);
                        const counterOfferRequestPayload = {
                            id: -1,
                            technician: {
                                id: integration.fnUserId,
                            },
                            notes: counterOfferNote,
                            counter: true,
                            active: true
                        };
                        if (!workOrderRequestValidation.isPaymentValid) {
                            const paymentCounterOfferReqPayload = await getPaymentCounterOfferRequestPayload(workOrder.pay, cron);
                            if (Object.keys(paymentCounterOfferReqPayload).length !== 0) {
                                counterOfferRequestPayload.pay = paymentCounterOfferReqPayload;
                            }
                        }
                        if (!workOrderRequestValidation.isScheduleValid) {
                            const scheduleCounterOfferReqPayload = await getScheduleCounterOfferRequestPayload(workOrder.schedule, cron);
                            if (Object.keys(scheduleCounterOfferReqPayload).length !== 0) {
                                counterOfferRequestPayload.schedule = scheduleCounterOfferReqPayload;
                            }
                        }
                        if (counterOfferRequestPayload.pay || counterOfferRequestPayload.schedule) {
                            await logWorkOrderOperation(`Initiating counter-offer process for work order #${workOrder.id}`, workOrder, counterOfferRequestPayload, cronName);
                            // TODO: Enable when actually want to counter-offer routed workorders
                            // await counterOfferWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken, counterOfferRequestPayload, cronName);
                        }
                    }
                
                    // Returning resolved promise to ensure the chain continues
                    return Promise.resolve();
                }, Promise.resolve());
                
            }
        });
        // Await all cron processing promises
        await Promise.all(cronPromises);
    });

    await Promise.all(userPromises);
    logger.info(`Cron job '${cronName}' ended.`, { cron: cronName });
});