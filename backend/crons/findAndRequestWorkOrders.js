import cron, { schedule } from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import { makeRequest } from "../utils/integrationHelpers.js";

// Will run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    if(process.env.DISABLED_CRONS === 'true') {
        return;
    }
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = new Date().toLocaleString();
    logger.info(`WORKORDER REQUEST:: Work order finding and requesting cron running at: ${currentDateTime}`);
    const userService = new UserService();
    const users = await userService.fetchAllUsers();

    const adminAccessToken = await userService.getServiceCompanyAdminAccessToken();
    if (!adminAccessToken) {
        logger.error(`WORKORDER REQUEST:: Service company admin is not integrated with FIELD NATION, work order request cron running failed`);
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
            logger.info(`WORKORDER REQUEST:: User id: ${user.userId} is not integrated with Field Nation`);
            return;
        }

        // checking configured crons
        const cronService = new CronService(user.userId);
        const crons = await cronService.fetchAllCrons();
        if (crons && !crons.length) {
            logger.info(`WORKORDER REQUEST:: User id: ${user.userId} has no cron configured`);
            return;
        }

        crons.map(async (cron) => {
            const locationRadius = cron.drivingRadius > 1 ? cron.drivingRadius : 50;
            const currentDateTime = new Date();
            const cronStartAt = new Date(cron.cronStartAt);
            const cronEndAt = new Date(cron.cronEndAt);
            const cronCenterZip = cron.centerZip ? cron.centerZip : '';
            const withinCronContractTime = (currentDateTime >= cronStartAt && currentDateTime <= cronEndAt);

            // silently avoid, if a cron is not active or deleted or cron contract ended
            if (cron.status == 'inactive' || cron.deleted || !withinCronContractTime) {
                return;
            }

            // check if cron has configured types of work orders
            if (!cron.typesOfWorkOrder.length) {
                logger.info(`WORKORDER REQUEST:: Cron id: ${cron.cronId} has no configured types of work order`);
                return;
            }

            const typeOfWorkQueryParams = cron.typesOfWorkOrder
                .map(typeId => `&f_type_of_work[]=${encodeURIComponent(typeId)}`)
                .join('');

            // Get available work orders
            const workOrdersResponse = await getAvailableWorkOrders(user.userId, integration.fnUserId, cronCenterZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);

            if (workOrdersResponse && workOrdersResponse.results) {
                workOrdersResponse.results.map(async (workOrder) => {
                    const allowedPaymentType = (workOrder.pay.type === 'fixed' && cron.isFixed) || (workOrder.pay.type === 'hourly' && cron.isHourly) || (workOrder.pay.type === 'device' && cron.isPerDevice) || (workOrder.pay.type === 'blended' && cron.isBlended);
                    if(!allowedPaymentType) {
                        logger.info(`WORKORDER REQUEST:: Payment type ${workOrder.pay.type} is not allowed, work order #${workOrder.id}, cron id: ${cron.cronId}`, workOrder);
                        return;
                    }
                    logger.info(
                        `Found Work Order, #ID: ${workOrder.id}, Title: ${workOrder.title}`,
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
                    if (workOrderRequestValidation.isValid) {
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
                        // TODO: Enable when actually want to request workorders
                        // Request work order
                        // requestWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken);
                    } else if (cron.isEnabledCounterOffer) {
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
                                `OK to counter-offer work order #${workOrder.id}`,
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
                        // TODO: Enable when actually want to counter-offer workorders
                        // Counter-offer work order
                        // counterOfferWorkOrders(workOrder.id, cron.cronId, user.userId, integration.fnUserId, adminAccessToken, counterOfferRequestPayload);
                    }
                })
            }
        });
    });
});

// Todo: fetch the note from cron
async function getCounterOfferNote(isPaymentValid, isScheduleValid, cron) {
    let note = '';
    if (!isPaymentValid && !isScheduleValid) {
        note = 'Payment and schedule counter offer note'
    } else if (!isPaymentValid) {
        note = 'Payment counter offer note';
    } else {
        note = 'Schedule counter offer note';
    }

    return note;
}

async function getWorkOrderRequestValidation(workOrder, cron) {
    const paymentSatisfied = await isPaymentSatisfied(workOrder.pay, cron);
    const scheduleSatisfied = await isScheduleSatisfied(workOrder.schedule, cron);
    return {
        isValid: paymentSatisfied && scheduleSatisfied,
        isPaymentValid: paymentSatisfied,
        isScheduleValid: scheduleSatisfied,
    }
}

async function isPaymentSatisfied(workOrderPayment, cron) {
    if (workOrderPayment.type === 'fixed' && cron.isFixed) {
        return workOrderPayment.base.amount >= cron.fixedPayment;
    }

    if (workOrderPayment.type === 'hourly' && cron.isHourly) {
        return workOrderPayment.base.amount >= cron.hourlyPayment;
    }

    if (workOrderPayment.type === 'device' && cron.isPerDevice) {
        return workOrderPayment.base.amount >= cron.perDevicePayment;
    }

    if (workOrderPayment.type === 'blended' && cron.isBlended) {
        const firstHourly = workOrderPayment.base.amount/workOrderPayment.base.base;
        const additionalHourly = workOrderPayment.additional.amount/workOrderPayment.additional.base;

        return (firstHourly >= cron.firstHourlyPayment && additionalHourly >= cron.additionalHourlyPayment);
    }

    return false;
}

async function isScheduleSatisfied(workOrderSchedule, cron) {
    const {
        mode,
        start: { utc: workOrderStartUtc },
        end: { utc: workOrderEndUtc } = {},
        est_labor_hours: estLaborHours = 0,
    } = workOrderSchedule.service_window;
    
    const workOrderStart = new Date(workOrderStartUtc);
    const workOrderEnd = workOrderEndUtc ? new Date(workOrderEndUtc) : new Date(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000);
    
    const cronStartAt = new Date(cron.cronStartAt.$date);
    const cronEndAt = new Date(cron.cronEndAt.$date);

    const workOrderDayName = workOrderStart.toLocaleString('en-US', { weekday: 'long' });
    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');

    // Check common conditions (off days, cron start/end times, time-off periods)
    if (workOrderStart < cronStartAt || workOrderEnd > cronEndAt || cron.offDays.includes(workOrderDayName)) {
        return false;
    }

    if (cron.timeOffStartAt && cron.timeOffEndAt) {
        const timeOffStart = new Date(cron.timeOffStartAt.$date);
        const timeOffEnd = new Date(cron.timeOffEndAt.$date);
        if (
            (workOrderStart >= timeOffStart && workOrderStart <= timeOffEnd) ||
            (workOrderEnd >= timeOffStart && workOrderEnd <= timeOffEnd)
        ) {
            return false;
        }
    }

    // Specific checks for different modes
    switch (mode) {
        case 'exact':
            const workingWindowStart = new Date(workOrderStart);
            workingWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1]);

            const workingWindowEnd = new Date(workOrderStart);
            workingWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1]);

            if (workOrderStart < workingWindowStart || workOrderEnd > workingWindowEnd) {
                return false;
            }
            break;

        case 'hours':
            const hoursWindowStart = new Date(workOrderStart);
            hoursWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1]);

            const hoursWindowEnd = new Date(workOrderEnd);
            hoursWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1]);

            if (workOrderStart < hoursWindowStart || workOrderEnd > hoursWindowEnd) {
                return false;
            }
            break;

        case 'between':
            if (workOrderStart < cronStartAt || workOrderEnd > cronEndAt) {
                return false;
            }
            break;

        default:
            return false; // Unsupported mode
    }

    return true; // If all checks passed
}

async function isScheduleSatisfiedOld(workOrderSchedule, cron) {
    // Arrive at a specific date and time - (Hard Start)
    if (workOrderSchedule.service_window.mode === 'exact') {
        // Convert the work order's start time to a Date object
        const workOrderStart = new Date(workOrderSchedule.service_window.start.utc);

        // Convert cron start and end times
        const cronStartAt = new Date(cron.cronStartAt.$date);
        const cronEndAt = new Date(cron.cronEndAt.$date);

        // Convert working window times
        const workingWindowStartTime = cron.workingWindowStartAt.split(':');
        const workingWindowEndTime = cron.workingWindowEndAt.split(':');

        // Check if the work order falls within the cron start and end times
        if (workOrderStart < cronStartAt || workOrderStart > cronEndAt) {
            return false; // Work order is outside the cron period
        }

        // Check if the work order is on an off day
        const workOrderDayName = workOrderStart.toLocaleString('en-US', { weekday: 'long' });
        if (cron.offDays.includes(workOrderDayName)) {
            return false; // Work order is on an off day
        }

        // Calculate work order end time using the estimated labor hours
        const estLaborHours = workOrderSchedule.est_labor_hours || 0;
        const workOrderEnd = new Date(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000);

        // Check if the work order falls within the cron's time-off period
        if (cron.timeOffStartAt && cron.timeOffEndAt) {
            const timeOffStart = new Date(cron.timeOffStartAt.$date);
            const timeOffEnd = new Date(cron.timeOffEndAt.$date);

            // Check if work start or end falls in time-off period
            if (
                (workOrderStart >= timeOffStart && workOrderStart <= timeOffEnd) ||
                (workOrderEnd >= timeOffStart && workOrderEnd <= timeOffEnd)
            ) {
                return false; // Work order falls within time-off period
            }
        }

        // Check if the work order falls within the cron's working hours for that day
        const workingWindowStart = new Date(workOrderStart);
        workingWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1]);

        const workingWindowEnd = new Date(workOrderStart);
        workingWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1]);

        // Ensure both the start and end of the work order fall within the working window
        if (workOrderStart < workingWindowStart || workOrderEnd > workingWindowEnd) {
            return false; // Work order is outside of working hours
        }

        // If all checks are passed, the schedule is satisfied
        return true;
    }

    // Complete work between specific hours
    if (workOrderSchedule.service_window.mode === 'hours') {
        // Convert the work order's start and end times to Date objects
        const workOrderStart = new Date(workOrderSchedule.service_window.start.utc);
        const workOrderEnd = new Date(workOrderSchedule.service_window.end.utc);

        // Convert cron start and end times
        const cronStartAt = new Date(cron.cronStartAt.$date);
        const cronEndAt = new Date(cron.cronEndAt.$date);

        // Convert working window times
        const workingWindowStartTime = cron.workingWindowStartAt.split(':');
        const workingWindowEndTime = cron.workingWindowEndAt.split(':');

        // Check if the work order falls within the cron start and end times
        if (workOrderStart < cronStartAt || workOrderEnd > cronEndAt) {
            return false; // Work order is outside the cron period
        }

        // Check if the work order is on an off day
        const workOrderDayName = workOrderStart.toLocaleString('en-US', { weekday: 'long' });
        if (cron.offDays.includes(workOrderDayName)) {
            return false; // Work order is on an off day
        }

        // Calculate work order end time using the estimated labor hours
        const estLaborHours = workOrderSchedule.est_labor_hours || 0;
        const estimatedWorkOrderEnd = new Date(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000);

        // Check if the work order falls within the cron's time-off period
        if (cron.timeOffStartAt && cron.timeOffEndAt) {
            const timeOffStart = new Date(cron.timeOffStartAt.$date);
            const timeOffEnd = new Date(cron.timeOffEndAt.$date);

            // Check if work start or end falls in time-off period
            if (
                (workOrderStart >= timeOffStart && workOrderStart <= timeOffEnd) ||
                (estimatedWorkOrderEnd >= timeOffStart && estimatedWorkOrderEnd <= timeOffEnd)
            ) {
                return false; // Work order falls within time-off period
            }
        }

        // Check if the work order falls within the cron's working hours for that day (using hours mode)
        if (workOrderSchedule.service_window.mode === 'hours') {
            const workingWindowStart = new Date(workOrderStart);
            const workingWindowEnd = new Date(workOrderEnd);

            // Set the working window's start and end times for each day
            workingWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1]);
            workingWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1]);

            // Ensure both the start and end of the work order fall within the working window for that day range
            if (workOrderStart < workingWindowStart || estimatedWorkOrderEnd > workingWindowEnd) {
                return false; // Work order is outside of working hours
            }
        }

        // If all checks are passed, the schedule is satisfied
        return true;
    }
    
    // Complete work anytime over a date range
    if (workOrderSchedule.service_window.mode === 'between') {
        // Convert the work order's start and end times to Date objects
        const workOrderStart = new Date(workOrderSchedule.service_window.start.utc);
        const workOrderEnd = new Date(workOrderSchedule.service_window.end.utc);

        // Convert cron start and end times
        const cronStartAt = new Date(cron.cronStartAt.$date);
        const cronEndAt = new Date(cron.cronEndAt.$date);

        // Check if the work order falls within the cron start and end times
        if (workOrderStart < cronStartAt || workOrderEnd > cronEndAt) {
            return false; // Work order is outside the cron period
        }

        // Check if the work order is on an off day
        const workOrderDayName = workOrderStart.toLocaleString('en-US', { weekday: 'long' });
        if (cron.offDays.includes(workOrderDayName)) {
            return false; // Work order is on an off day
        }

        // Calculate work order end time using the estimated labor hours
        const estLaborHours = workOrderSchedule.est_labor_hours || 0;
        const estimatedWorkOrderEnd = new Date(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000);

        // Check if the work order falls within the cron's time-off period
        if (cron.timeOffStartAt && cron.timeOffEndAt) {
            const timeOffStart = new Date(cron.timeOffStartAt.$date);
            const timeOffEnd = new Date(cron.timeOffEndAt.$date);

            // Check if work start or end falls in time-off period
            if (
                (workOrderStart >= timeOffStart && workOrderStart <= timeOffEnd) ||
                (estimatedWorkOrderEnd >= timeOffStart && estimatedWorkOrderEnd <= timeOffEnd)
            ) {
                return false; // Work order falls within time-off period
            }
        }

        // Check if the work order mode is "between"
        if (workOrderSchedule.service_window.mode === 'between') {
            // No specific working hours, just ensure work fits within the start and end date range
            if (workOrderStart < cronStartAt || estimatedWorkOrderEnd > workOrderEnd) {
                return false; // Work order starts before or ends after the defined window
            }
        }

        // If all checks are passed, the schedule is satisfied
        return true;

    }
}

async function getPaymentCounterOfferRequestPayload(workOrderPayment, cron) {
    let paymentRequestPayload = {};
    if (workOrderPayment.type === 'fixed' && cron.isFixed) {
        // form request
        paymentRequestPayload = {
            type: "fixed",
            base: {
                units: workOrderPayment.base.units,
                amount: cron.fixedPayment
            },
            additional: {
                units: 0,
                amount: 0
            },
            validation: {}
        };
    }

    if (workOrderPayment.type === 'hourly' && cron.isHourly) {
        // form request
        paymentRequestPayload = {
            type: "hourly",
            base: {
                units: workOrderPayment.base.units,
                amount: cron.hourlyPayment,
            },
            additional: {
                units: 0,
                amount: 0
            },
            validation: {}
        };
    }

    if (workOrderPayment.type === 'device' && cron.isPerDevice) {
        // form request
        paymentRequestPayload = {
            type: "device",
            base: {
                units: workOrderPayment.base.units,
                amount: cron.perDevicePayment,
            },
            additional: {
                units: 0,
                amount: 0
            },
            validation: {}
        };

    }

    if (workOrderPayment.type === 'blended' && cron.isBlended) {
        // form request
        paymentRequestPayload = {
            type: "blended",
            base: {
                units: workOrderPayment.base.units,
                amount: workOrderPayment.base.units * cron.firstHourlyPayment,
            },
            additional: {
                units: workOrderPayment.additional.units,
                amount: workOrderPayment.additional.units * cron.additionalHourlyPayment,
            },
            validation: {}
        };

    }

    return paymentRequestPayload;

}

async function getScheduleCounterOfferRequestPayload(workOrderSchedule, cron) {
    let scheduleRequestPayload = {};
    // Arrive at a specific date and time - (Hard Start)
    if (workOrderSchedule.service_window.mode === 'exact') {
        // form request
        scheduleRequestPayload = {
            service_window: {
                mode: "exact",
                start: {
                    local: {
                        date: "2024-09-20",
                        time: "10:00:00"
                    }
                },
                time_zone: {
                    id: workOrderSchedule.time_zone.id,
                }
            },
            validation: {}
        };

    }

    // Complete work anytime over a date range
    if (workOrderSchedule.service_window.mode === 'hours' || workOrderSchedule.service_window.mode === 'between') {
        // form request
        scheduleRequestPayload = {
            service_window: {
                mode: "between",
                start: {
                    local: {
                        date: "2024-09-20",
                        time: "10:00:00"
                    }
                },
                end: {
                    local: {
                        date: "2024-09-25",
                        time: "11:15:00"
                    }
                },
                time_zone: {
                    id: workOrderSchedule.time_zone.id,
                }
            },
            validation: {}
        };

    }

    return scheduleRequestPayload;
}

// Function to get available work orders
async function getAvailableWorkOrders(userId, fnUserId, centerZip, locationRadius, typeOfWorkQueryParams, adminAccessToken) {
    const availableWorkOrdersUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders?default_view=list&f_=false&f_location_radius[]=${centerZip}&f_location_radius[]=${locationRadius}&list=workorders_available&sticky=1&view=list&per_page=${process.env.WORKORDERS_PER_PAGE}&f_sc_providers[]=${fnUserId}${typeOfWorkQueryParams}&access_token=${adminAccessToken}`;

    try {
        const response = await makeRequest('GET', availableWorkOrdersUrl, {}, {}, {}, userId);
        if (response && response.metadata && response.metadata.total > 0) {
            logger.info(`WORKORDER REQUEST:: ${response.metadata.total} available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        } else {
            logger.info(`WORKORDER REQUEST:: No available work orders found for user id: ${userId}, field nation user id: ${fnUserId}`);
        }
        return response;
    } catch (error) {
        logger.error(`WORKORDER REQUEST:: Failed to get available work orders for user ${userId}, field nation user id: ${fnUserId} : ${error.message}`);
        return null;
    }
}

// Function to request a work order
async function requestWorkOrders(workOrderId, cronId, userId, actingUserId, accessToken) {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/${workOrderId}/requests?acting_user_id=${actingUserId}&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, {}, {}, userId);
        if (response) {
            logger.info(`WORKORDER REQUEST:: Work order ${workOrderId} successfully requested by user id: ${userId}, field nation user id: ${actingUserId}`);

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`WORKORDER REQUEST:: Failed to request work order ${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`);
    }
}

// Function to counter-offer a work order
async function counterOfferWorkOrders(workOrderId, cronId, userId, actingUserId, accessToken, payload) {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/${workOrderId}/requests?acting_user_id=${actingUserId}&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, payload, {}, userId);
        if (response) {
            logger.info(`WORKORDER COUNTER-OFFER:: Work order ${workOrderId} successfully counter-offerred by user id: ${userId}, field nation user id: ${actingUserId}`);

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`WORKORDER COUNTER-OFFER:: Failed to counter-offer work order ${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`);
    }
}

export default cron;
