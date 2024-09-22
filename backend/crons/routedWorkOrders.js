import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import moment from 'moment-timezone';
import { getRoutedWorkOrders, acceptRoutedWorkOrder } from '../utils/cronHelpers/routedWorkOrdersHelper.js';
import { getCounterOfferNote } from '../utils/cronHelpers/counterOfferHelper.js';
import { getWorkOrderRequestValidation, requestWorkOrders, counterOfferWorkOrders } from '../utils/cronHelpers/commonWorkOrdersHelper.js';
import { getPaymentCounterOfferRequestPayload, getScheduleCounterOfferRequestPayload } from '../utils/cronHelpers/counterOfferHelper.js';

// Will run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    if (process.env.DISABLED_CRONS === 'true') {
        return;
    }
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = moment.utc().toDate().toLocaleString();
    logger.info(`ROUTED WORKORDER:: Routed work order cron running at: ${currentDateTime}`);
    const userService = new UserService();
    const users = await userService.fetchAllUsers();

    const adminAccessToken = await userService.getServiceCompanyAdminAccessToken();
    if (!adminAccessToken) {
        logger.error(`ROUTED WORKORDER:: Service company admin is not integrated with FIELD NATION, routed work order request cron running failed`);
        return;
    }

    users.map(async (user) => {
        // silently avoid, blocked and inactive users
        if (user.blocked || !user.isActive) {
            return;
        }

        // checking integration with Field Nation
        const integrationService = new IntegrationService(user.userId);
        const integration = await integrationService.fetchIntegration();
        if (!integration || !integration.fnUserId || integration.integrationStatus == 'Not Connected' || integration.disabled) {
            // logger.info(`WORKORDER REQUEST:: User id: ${user.userId} is not integrated with Field Nation`);
            return;
        }

        // checking configured crons
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchAllCrons();
        if (crons && !crons.length) {
            // logger.info(`WORKORDER REQUEST:: User id: ${user.userId} has no cron configured`);
            return;
        }

        crons.map(async (cron) => {
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
                // logger.info(`WORKORDER REQUEST:: Cron id: ${cron.cronId} has no configured types of work order`);
                return;
            }

            const typeOfWorkQueryParams = cron.typesOfWorkOrder
                .map(typeId => `&f_type_of_work[]=${encodeURIComponent(typeId)}`)
                .join('');

            // Get available work orders
            const workOrdersResponse = await getRoutedWorkOrders(user.userId, integration.fnUserId, cronCenterZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);

            if (workOrdersResponse && workOrdersResponse.results) {
                workOrdersResponse.results.map(async (workOrder) => {
                    // TODO: Remove DEBUG Code
                    // if (workOrder.id !== 65856){
                    //     return;
                    // }
                    const allowedPaymentType = (workOrder.pay.type === 'fixed' && cron.isFixed) || (workOrder.pay.type === 'hourly' && cron.isHourly) || (workOrder.pay.type === 'device' && cron.isPerDevice) || (workOrder.pay.type === 'blended' && cron.isBlended);
                    if (!allowedPaymentType) {
                        logger.info(`ROUTED WORKORDER REQUEST:: Payment type ${workOrder.pay.type} is not allowed, work order #${workOrder.id}, cron id: ${cron.cronId}`, workOrder);
                        return;
                    }
                    logger.info(
                        `Found Routed Work Order, #ID: ${workOrder.id}, Title: ${workOrder.title}`,
                        {
                            workorder_id: workOrder.id,
                            title: workOrder.title,
                            schedule: workOrder.schedule,
                            pay: workOrder.pay,
                            location: workOrder.location,
                            types_of_work: workOrder.types_of_work,
                        }
                    );

                    const workOrderRequestValidation = await getWorkOrderRequestValidation(workOrder, cron);
                    logger.info(
                        `Payment & Schedule checking: #ID: ${workOrder.id}, isPaymentSatisfied: ${workOrderRequestValidation.isPaymentValid}, isScheduleSatisfied: ${workOrderRequestValidation.isScheduleValid} `,
                        workOrderRequestValidation
                    );

                    if (workOrderRequestValidation.isValid && workOrder.status.name === 'Routed') {
                        logger.info(
                            `OK to accept routed work order #${workOrder.id}`,
                            {
                                workorder_id: workOrder.id,
                                title: workOrder.title,
                                schedule: workOrder.schedule,
                                pay: workOrder.pay,
                                location: workOrder.location,
                                types_of_work: workOrder.types_of_work,
                            }
                        );
                        // TODO: Enable when actually want to accept routed workorders
                        // Accept routed work order
                        // acceptRoutedWorkOrder(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken);

                    }

                    if (workOrderRequestValidation.isValid && workOrder.status.name === 'Published') {
                        logger.info(
                            `OK to request work order #${workOrder.id}`,
                            {
                                workorder_id: workOrder.id,
                                title: workOrder.title,
                                schedule: workOrder.schedule,
                                pay: workOrder.pay,
                                location: workOrder.location,
                                types_of_work: workOrder.types_of_work,
                            }
                        );
                        // TODO: Enable when actually want to request routed workorders
                        // Request routed work order
                        // requestWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken);
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
                            logger.info(
                                `OK to counter-offer routed work order #${workOrder.id}`,
                                {
                                    workorder_id: workOrder.id,
                                    title: workOrder.title,
                                    schedule: workOrder.schedule,
                                    pay: workOrder.pay,
                                    location: workOrder.location,
                                    types_of_work: workOrder.types_of_work,
                                    payload: counterOfferRequestPayload
                                }
                            );
                        }
                        // TODO: Enable when actually want to counter-offer routed workorders
                        // Counter-offer work order
                        // counterOfferWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken, counterOfferRequestPayload);
                    }
                })
            }
        });
    });
});