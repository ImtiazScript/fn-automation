import cron, { schedule } from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import AssignedWorkOrder from '../services/assignedWorkOrdersService.js';
import { makeRequest } from "../utils/integrationHelpers.js";

// Will run every 30 minutes
cron.schedule('*  * * * *', async () => {
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
                    logger.info(`Work Order Request validation, #ID: ${workOrder.id}, isPaymentValid: ${workOrderRequestValidation.isPaymentValid}, isScheduleValid: ${workOrderRequestValidation.isScheduleValid} `, workOrderRequestValidation);
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
    const workOrderId = workOrderSchedule.work_order_id;
    const workOrderStart = new Date(workOrderStartUtc);
    const workOrderEnd = workOrderEndUtc ? new Date(workOrderEndUtc) : new Date(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000);

    // Check for off-days
    const outsideOffDays = await outSideOfOffDays(workOrderId, cron, workOrderStart, workOrderEnd);
    if (!outsideOffDays) {
        return false;
    }

    // Check for planned time-off
    const outSidePlannedTimeOff = await outSideOfPlannedTimeOff(workOrderId, cron, workOrderStart, workOrderEnd);
    if (!outSidePlannedTimeOff) {
        return false;
    }

    // Check for work order overlaps with already assigned schedules
    const isOverLapping = await isOverlappingWithAssignedWorkOrders(workOrderId, workOrderStart, workOrderEnd, mode);
    if (isOverLapping) {
        return false;
    }

    // Check for daily working schedule
    const fitsWorkingWindow = await isInsideWorkingWindow(workOrderId, cron, mode, workOrderStart, workOrderEnd);
    if (!fitsWorkingWindow) {
        return false;
    }

    return true;
}

async function outSideOfOffDays(workOrderId, cron, workOrderStart, workOrderEnd) {
    const workOrderStartClone = new Date(workOrderStart.getTime());
    const workOrderEndClone = new Date(workOrderEnd.getTime());
    const workOrderDayNames = await getWorkOrderDayNames(workOrderStartClone, workOrderEndClone);
    if (workOrderDayNames.every(day => cron.offDays.includes(day))) {
        console.log(`off day conflict, id # ${workOrderId}`);
        return false;
    }

    true;
}

async function getWorkOrderDayNames(workOrderStartDayTime, workOrderEndDayTime) {
    const dayNames = new Set();

    while (workOrderStartDayTime <= workOrderEndDayTime) {
        const dayName = workOrderStartDayTime.toLocaleString('en-US', { weekday: 'long' });
        dayNames.add(dayName);

        workOrderStartDayTime.setUTCDate(workOrderStartDayTime.getUTCDate() + 1);
    }

    return Array.from(dayNames); // Convert Set to Array
}

async function outSideOfPlannedTimeOff(workOrderId, cron, workOrderStart, workOrderEnd) {
    if (cron.timeOffStartAt && cron.timeOffEndAt) {
        const timeOffStart = new Date(cron.timeOffStartAt);
        const timeOffEnd = new Date(cron.timeOffEndAt);
        if (workOrderStart >= timeOffStart && workOrderEnd <= timeOffEnd){
            console.log(`planned time-off conflict, id # ${workOrderId}`);
            return false;
        }
    }
    return true;
}

async function isOverlappingWithAssignedWorkOrders(workOrderId, workOrderStart, workOrderEnd, mode) {
    try {
        const assignedWorkOrderService = new AssignedWorkOrder();
        const alreadyAssignedSchedules = await assignedWorkOrderService.fetchAssignedWorkOrdersSchedules();

        // Use `some` to determine if any schedule overlaps
        const isOverlapping = alreadyAssignedSchedules.some((assignedSchedule) => {
            const assignedStart = new Date(assignedSchedule.start.utc);
            const assignedEnd = new Date(assignedSchedule.end.utc);

            switch (mode) {
                case 'exact':
                    if (
                        // if workorder start-time is inside another workorders schedule
                        (workOrderStart >= assignedStart && workOrderStart <= assignedEnd) ||
                        // if workorder start-time is inside another workorders schedule
                        (workOrderEnd >= assignedStart && workOrderEnd <= assignedEnd) ||
                        // if workorder start-time is before and end-time is after another wororder's schedule
                        (workOrderStart <= assignedStart && workOrderEnd >= assignedEnd)
                    ) {
                        console.log(`overlapped workorder #id ${workOrderId} with assigned workorder, #id ${assignedSchedule.work_order_id}`);
                        return true;
                    }
                    break;

                case 'hours':
                case 'between':
                    if (
                        // if work order start and end time is inside another workorder's schedule
                        (workOrderStart >= assignedStart && workOrderEnd <= assignedEnd) ||
                        // if work order start -time is before and end-time is after another assigned work order's schedule
                        (workOrderStart <= assignedStart && workOrderEnd >= assignedEnd)
                    ) {
                        console.log(`overlapped workorder #id ${workOrderId} with assigned workorder, #id ${assignedSchedule.work_order_id}`);
                        return true;
                    }
                    break;

                default:
                    return false;
            }
        });

        return isOverlapping;
    } catch (error) {
        // Handle potential errors
        logger.error('Error checking overlap with assigned work orders:', error);
        return false;
    }
}

async function isInsideWorkingWindow(workOrderId, cron, mode, workOrderStart, workOrderEnd) {
    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');
    switch (mode) {
        case 'exact':
        case 'hours':
            // Initialize working window times
            const workingWindowStart = new Date();
            const workingWindowEnd = new Date();
            workingWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
            workingWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1], 0, 0);
            // Check if the working window spans across two days (e.g., 20:00 - 08:00)
            if (workingWindowEnd < workingWindowStart) {
                workingWindowEnd.setUTCDate(workingWindowEnd.getUTCDate() + 1);
            }

            // Initialize work order times
            const workOrderWindowStart = new Date();
            workOrderWindowStart.setUTCHours(workOrderStart.getUTCHours(), workOrderStart.getUTCMinutes(), 0, 0);
            const workOrderWindowEnd = new Date();
            workOrderWindowEnd.setUTCHours(workOrderEnd.getUTCHours(), workOrderEnd.getUTCMinutes(), 0, 0);
            // Check if the workorder window spans across two days (e.g., 20:00 - 08:00)
            if (workOrderWindowEnd < workOrderWindowStart) {
                workOrderWindowEnd.setUTCDate(workOrderWindowEnd.getUTCDate() + 1);
            }


            // Compare work order times with the working window times
            if (workOrderWindowStart < workingWindowStart || workOrderWindowEnd > workingWindowEnd) {
                console.log(`daily working schedule conflict, id # ${workOrderId}`);
                return false;
            }
            break;

        case 'between':
            return true;

        default:
            return false; // Unsupported mode
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
                units: workOrderPayment.additional.units,
                amount: workOrderPayment.additional.amount,
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
                units: workOrderPayment.additional.units,
                amount: workOrderPayment.additional.amount,
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
                units: workOrderPayment.additional.units,
                amount: workOrderPayment.additional.amount,
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
                amount: cron.additionalHourlyPayment,
            },
            validation: {}
        };

    }

    return paymentRequestPayload;

}

async function getScheduleCounterOfferRequestPayload(workOrderSchedule, cron) {
    let scheduleRequestPayload = {};

    const { startTime, endTime } = await getNextAvailableTimeSchedule(workOrderSchedule, cron);
    
    const startDate = startTime.toISOString().split('T')[0]; // Extract date in YYYY-MM-DD format
    const startTimeStr = startTime.toISOString().split('T')[1].slice(0, 8); // Extract time in HH:MM:SS format
    const endDate = endTime.toISOString().split('T')[0]; // Extract date in YYYY-MM-DD format
    const endTimeStr = endTime.toISOString().split('T')[1].slice(0, 8); // Extract time in HH:MM:SS format

    // Arrive at a specific date and time - (Hard Start)
    if (workOrderSchedule.service_window.mode === 'exact') {
        // form request
        scheduleRequestPayload = {
            service_window: {
                mode: "exact",
                start: {
                    local: {
                        date: startDate,
                        time: startTimeStr
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
                        date: startDate,
                        time: startTimeStr,
                    }
                },
                end: {
                    local: {
                        date: endDate,
                        time: endTimeStr
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

async function getNextAvailableTimeSchedule(workOrderSchedule, cron) {
    const assignedWorkOrderService = new AssignedWorkOrder();
    const alreadyAssignedSchedules = await assignedWorkOrderService.fetchAssignedWorkOrdersSchedules();

    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');
    
    let startTime;
    let endTime;

    // Start with the work order's start time
    let potentialStartTime = new Date(workOrderSchedule.service_window.start.utc);

    // Helper function to check if a day is an off day
    const isOffDay = (date) => {
        const dayName = date.toLocaleString('en-US', { weekday: 'long' });
        return cron.offDays.includes(dayName);
    };

    // Helper function to check if the time is within planned time off
    const isPlannedTimeOff = (start, end) => {
        if (cron.timeOffStartAt && cron.timeOffEndAt) {
            const timeOffStart = new Date(cron.timeOffStartAt);
            const timeOffEnd = new Date(cron.timeOffEndAt);
            return (start >= timeOffStart && start <= timeOffEnd) ||
                   (end >= timeOffStart && end <= timeOffEnd) ||
                   (start <= timeOffStart && end >= timeOffEnd);
        }
        return false;
    };

    // Adjust to next working window if the potential start time is outside the working window
    const potentialStartHour = potentialStartTime.getUTCHours();
    if (potentialStartHour < parseInt(workingWindowStartTime[0])) {
        potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
    } else if (potentialStartHour >= parseInt(workingWindowEndTime[0])) {
        // If it's after working hours, move to the next day and set to start of the next working window
        potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
        potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
    }

    // Loop to find the next available time slot that doesn't overlap with off days, time off, or already assigned schedules
    let foundSlot = false;
    while (!foundSlot) {
        const potentialEndTime = new Date(potentialStartTime.getTime() + (workOrderSchedule.est_labor_hours || 1) * 60 * 60 * 1000);

        // Ensure the potential end time is within the working window
        const potentialEndHour = potentialEndTime.getUTCHours();
        if (potentialEndHour >= parseInt(workingWindowEndTime[0])) {
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
            continue;
        }

        // Skip off days and planned time off
        if (isOffDay(potentialStartTime) || isPlannedTimeOff(potentialStartTime, potentialEndTime)) {
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
            continue;
        }

        // Check against already assigned schedules for conflicts
        let hasConflict = false;
        for (const assignedSchedule of alreadyAssignedSchedules) {
            const assignedStart = new Date(assignedSchedule.start.utc);
            const assignedEnd = new Date(assignedSchedule.end.utc);

            if (
                (potentialStartTime >= assignedStart && potentialStartTime <= assignedEnd) ||
                (potentialEndTime >= assignedStart && potentialEndTime <= assignedEnd) ||
                (potentialStartTime <= assignedStart && potentialEndTime >= assignedEnd)
            ) {
                hasConflict = true;
                break;
            }
        }

        if (!hasConflict) {
            foundSlot = true;
            startTime = potentialStartTime;
            endTime = potentialEndTime;
        } else {
            // If there's a conflict, move to the next possible working time
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
        }
    }

    return { startTime, endTime };
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
