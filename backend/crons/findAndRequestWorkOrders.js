import cron, { schedule } from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';
import CronService from '../services/cronService.js';
import AssignedWorkOrder from '../services/assignedWorkOrdersService.js';
import { makeRequest } from "../utils/integrationHelpers.js";
import moment from 'moment-timezone';

// Will run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    if(process.env.DISABLED_CRONS === 'true') {
        return;
    }
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = moment.utc().toDate().toLocaleString();
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
            const workOrdersResponse = await getAvailableWorkOrders(user.userId, integration.fnUserId, cronCenterZip, locationRadius, typeOfWorkQueryParams, adminAccessToken);

            if (workOrdersResponse && workOrdersResponse.results) {
                workOrdersResponse.results.map(async (workOrder) => {
                    // TODO: Remove DEBUG Code
                    // if (workOrder.id !== 16768){
                    //     return;
                    // }
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
                    logger.info(
                        `Payment & Schedule checking: #ID: ${workOrder.id}, isPaymentSatisfied: ${workOrderRequestValidation.isPaymentValid}, isScheduleSatisfied: ${workOrderRequestValidation.isScheduleValid} `,
                        workOrderRequestValidation
                    );
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

    // Check for off-days
    const outsideOffDays = await outSideOfOffDays(workOrderId, cron, workOrderStartUtc, workOrderEndUtc);
    if (!outsideOffDays) {
        return false;
    }
    const workOrderStart = moment.utc(workOrderStartUtc).toDate();
    const workOrderEnd = workOrderEndUtc ? moment.utc(workOrderEndUtc).toDate() : moment.utc(workOrderStart.getTime() + estLaborHours * 60 * 60 * 1000).toDate();

    // Check for planned time-off
    const outSidePlannedTimeOff = await outSideOfPlannedTimeOff(workOrderId, cron, workOrderStart, workOrderEnd);
    if (!outSidePlannedTimeOff) {
        return false;
    }

    // Check for work order overlaps with already assigned schedules
    const checkOverLapping = await checkOverlappingWithAssignedWorkOrders(workOrderId, workOrderStart, workOrderEnd, mode);
    if (checkOverLapping.isOverlapped) {
        return false;
    }

    // Check for daily working schedule
    const fitsWorkingWindow = await isInsideWorkingWindow(workOrderId, cron, mode, workOrderStart, workOrderEnd);
    if (!fitsWorkingWindow) {
        return false;
    }

    return true;
}

async function outSideOfOffDays(workOrderId, cron, workOrderStartUtc, workOrderEndUtc) {
    const workOrderDayNames = await getWorkOrderDayNames(workOrderStartUtc, workOrderEndUtc, cron.timeZone);
    if (workOrderDayNames.every(day => cron.offDays.includes(day))) {
        console.log(`off day conflict, id # ${workOrderId}`);
        return false;
    }

    return true;
}

async function getWorkOrderDayNames(workOrderStartDayTimeUtc, workOrderEndDayTimeUtc, timeZone) {
    const dayNames = new Set();

    // Convert UTC time to providers local timezone
    let currentTime = moment.utc(workOrderStartDayTimeUtc).tz(timeZone); 
    const endTime = moment.utc(workOrderEndDayTimeUtc).tz(timeZone);

    while (currentTime.isSameOrBefore(endTime)) {
        const dayName = currentTime.format('dddd'); // Get day name in local time
        dayNames.add(dayName);

        // Add 1 day to the current time in the same timezone
        currentTime.add(1, 'days');
    }

    return Array.from(dayNames);
}

async function outSideOfPlannedTimeOff(workOrderId, cron, workOrderStart, workOrderEnd) {
    if (cron.timeOffStartAt && cron.timeOffEndAt) {
        const timeOffStart = moment.utc(cron.timeOffStartAt).toDate();
        const timeOffEnd = moment.utc(cron.timeOffEndAt).toDate();
        if (workOrderStart >= timeOffStart && workOrderEnd <= timeOffEnd){
            console.log(`planned time-off conflict, id # ${workOrderId}`);
            return false;
        }
    }
    return true;
}

async function checkOverlappingWithAssignedWorkOrders(workOrderId, workOrderStart, workOrderEnd, mode) {
    try {
        const assignedWorkOrderService = new AssignedWorkOrder();
        const alreadyAssignedSchedules = await assignedWorkOrderService.fetchAssignedWorkOrdersSchedules();

        // Use `find` to return the first overlapping schedule, or undefined if none
        const overlappingSchedule = alreadyAssignedSchedules.find((assignedSchedule) => {
            const assignedStart = moment.utc(assignedSchedule.start.utc).toDate();
            const assignedEnd = moment.utc(assignedSchedule.end.utc).toDate();

            switch (mode) {
                case 'exact':
                    // Exact mode: Check for any overlap
                    return (
                        (workOrderStart >= assignedStart && workOrderStart <= assignedEnd) || // Work order start overlaps
                        (workOrderEnd >= assignedStart && workOrderEnd <= assignedEnd) || // Work order end overlaps
                        (workOrderStart <= assignedStart && workOrderEnd >= assignedEnd)    // Work order completely overlaps another
                    );

                case 'hours':
                case 'between':
                    // Hours or Between mode: Check for inclusion or full overlap
                    return (
                        (workOrderStart >= assignedStart && workOrderEnd <= assignedEnd) || // Work order is within assigned schedule
                        (workOrderStart <= assignedStart && workOrderEnd >= assignedEnd)    // Work order completely overlaps
                    );

                default:
                    return false;
            }
        });

        // If an overlap is found, return the details, otherwise return no overlap
        if (overlappingSchedule) {
            const assignedWorkOrderId = overlappingSchedule.work_order_id;
            console.log(`Overlapped work order #id ${workOrderId} with assigned work order, #id ${assignedWorkOrderId}`);
            return {
                isOverlapped: true,
                overlappedWorkOrderId: assignedWorkOrderId,
            };
        }

        // No overlap found
        return {
            isOverlapped: false,
            overlappedWorkOrderId: 0,
        };

    } catch (error) {
        // Handle potential errors
        logger.error('Error checking overlap with assigned work orders:', error);
        return {
            isOverlapped: false,
            overlappedWorkOrderId: 0,
        };
    }
}

async function isInsideWorkingWindow(workOrderId, cron, mode, workOrderStart, workOrderEnd) {
    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');
    switch (mode) {
        case 'exact':
        case 'hours':
            // Initialize working window times
            const workingWindowStart = moment.utc().toDate();
            const workingWindowEnd = moment.utc().toDate();
            workingWindowStart.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);
            workingWindowEnd.setUTCHours(workingWindowEndTime[0], workingWindowEndTime[1], 0, 0);
            // Check if the working window spans across two days (e.g., 20:00 - 08:00)
            if (workingWindowEnd < workingWindowStart) {
                workingWindowEnd.setUTCDate(workingWindowEnd.getUTCDate() + 1);
            }

            // Initialize work order times
            const workOrderWindowStart = moment.utc().toDate();
            const workOrderWindowEnd = moment.utc().toDate();
            workOrderWindowStart.setUTCHours(workOrderStart.getUTCHours(), workOrderStart.getUTCMinutes(), 0, 0);
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

    return true;
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
    const { startTime, endTime } = await getNextAvailableTimeSchedule(workOrderSchedule, cron);

    // Convert UTC time to local time based on work order timeZone
    const timeZone = workOrderSchedule.time_zone.name;
    const localStartTime = moment(startTime).tz(timeZone);
    const localEndTime = moment(endTime).tz(timeZone);

    // Extract date and time for local start and end times
    const startDate = localStartTime.format('YYYY-MM-DD');
    const startTimeStr = localStartTime.format('HH:mm:ss');
    const endDate = localEndTime.format('YYYY-MM-DD');
    const endTimeStr = localEndTime.format('HH:mm:ss');

    let scheduleRequestPayload = {};

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
    const workOrderId = workOrderSchedule.work_order_id;
    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');

    let startTime;
    let endTime;
    const today = moment.utc().toDate();

    // Start with the work order's start time
    let potentialStartTime = moment.utc(workOrderSchedule.service_window.start.utc).toDate();
    let potentialEndTime = moment.utc(workOrderSchedule.service_window.end.utc).toDate();
    
    // If the start day is a previous day or today then make that tomorrow
    if (potentialStartTime <= today) {
        potentialStartTime.setUTCDate(today.getUTCDate() + 1);
        potentialEndTime.setUTCDate(potentialStartTime.getUTCDate());
    }

    // Loop to find the next available time slot that doesn't overlap with off days, time off, or already assigned schedules
    let foundSlot = false;
    let iterationCount = 0; // Added counter to prevent infinite loop
    const maxIterations = 50; // Define a maximum number of iterations

    while (!foundSlot && iterationCount < maxIterations) {
        iterationCount++;
        const fitsWorkingWindow = await isInsideWorkingWindow(workOrderId, cron, workOrderSchedule.service_window.mode, potentialStartTime, potentialEndTime);
        if (!fitsWorkingWindow) {
            // Setting potential start time
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);

            // Setting potential end time
            if (workingWindowStartTime[0] > workingWindowEndTime[0]) {
                // if provider work in night-shift (across two days) - Utc
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            } else {
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate());
            }
            potentialEndTime.setUTCHours(potentialStartTime.getUTCHours() + (workOrderSchedule.est_labor_hours || 1), potentialStartTime.getUTCMinutes(), 0, 0);
            console.log(`Outside of working windows ${workOrderId}`);
            continue;
        }

        const outsideOffDays = await outSideOfOffDays(workOrderSchedule.work_order_id, cron, potentialStartTime, potentialEndTime);
        if (!outsideOffDays) {
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);

            // Setting potential end time
            if (workingWindowStartTime[0] > workingWindowEndTime[0]) {
                // if provider work in night-shift (across two days) - Utc
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            } else {
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate());
            }
            potentialEndTime.setUTCHours(potentialStartTime.getUTCHours() + (workOrderSchedule.est_labor_hours || 1), potentialStartTime.getUTCMinutes(), 0, 0);
            console.log(`In off-day, ${workOrderId}`);
            continue;
        }

        const outsidePlannedTimeOff = await outSideOfPlannedTimeOff(workOrderSchedule.work_order_id, cron, potentialStartTime, potentialEndTime);
        if (!outsidePlannedTimeOff) {
            // TODO: Get the number of leave days and find remaing days than today then add here
            potentialStartTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            potentialStartTime.setUTCHours(workingWindowStartTime[0], workingWindowStartTime[1], 0, 0);

            // Setting potential end time
            if (workingWindowStartTime[0] > workingWindowEndTime[0]) {
                // if provider work in night-shift (across two days) - Utc
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate() + 1);
            } else {
                potentialEndTime.setUTCDate(potentialStartTime.getUTCDate());
            }
            potentialEndTime.setUTCHours(potentialStartTime.getUTCHours() + (workOrderSchedule.est_labor_hours || 1), potentialStartTime.getUTCMinutes(), 0, 0);
            console.log(`In planned off-day, ${workOrderId}`);
            continue;
        }

        // Check against already assigned schedules for conflicts
        let checkOverLapping = await checkOverlappingWithAssignedWorkOrders(workOrderSchedule.work_order_id, potentialStartTime, potentialEndTime, workOrderSchedule.service_window.mode);

        if (checkOverLapping.isOverlapped) {
            // Handle overlap by adjusting the schedule
            const assignedWorkOrderService = new AssignedWorkOrder();
            const overlappedWorkOrderSchedule = await assignedWorkOrderService.getAssignedWorkOrderScheduleByWorkOrderId(checkOverLapping.overlappedWorkOrderId);

            // Adjust potential time for the overlap
            const adjustedTimes = await adjustForOverlap(potentialStartTime, potentialEndTime, overlappedWorkOrderSchedule, workOrderSchedule);
            potentialStartTime = adjustedTimes.startTime;
            potentialEndTime = adjustedTimes.endTime;

            console.log(`Work order #${workOrderId} has conflict with assigned work order #${checkOverLapping.overlappedWorkOrderId}`);
            continue;
        } else {
            foundSlot = true;
            startTime = potentialStartTime;
            endTime = potentialEndTime;
        }
    }

    return { startTime, endTime };
}

// Helper function to add hours to a date and handle day rollover
async function addHoursToDate(date, hoursToAdd) {
    const newDate = moment.utc(date).toDate();
    
    if (newDate.getUTCHours() + hoursToAdd >= 24) {
        newDate.setUTCDate(newDate.getUTCDate() + 1);
        newDate.setUTCHours(newDate.getUTCHours() % 24);
    } else {
        newDate.setUTCHours(newDate.getUTCHours() + hoursToAdd);
    }
    
    return newDate;
}

// Helper function to check for conflict and adjust times
async function adjustForOverlap(potentialStartTime, potentialEndTime, overlappedWorkOrderSchedule, workOrderSchedule) {
    let startTime = potentialStartTime;
    let endTime = potentialEndTime;

    // Calculate potential end time based on labor hours
    const totalLaborHours = workOrderSchedule.est_labor_hours || 1 + overlappedWorkOrderSchedule.est_labor_hours;

    // If conflict exists and the total exceeds 24 hours, move to next day
    if (startTime.getUTCHours() + overlappedWorkOrderSchedule.est_labor_hours >= 24) {
        startTime = await addHoursToDate(startTime, overlappedWorkOrderSchedule.est_labor_hours);
        endTime = await addHoursToDate(startTime, totalLaborHours);
    } else {
        // Adjust end time based on the current schedule
        startTime.setUTCHours(startTime.getUTCHours() + overlappedWorkOrderSchedule.est_labor_hours);
        endTime = await addHoursToDate(startTime, totalLaborHours);
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
