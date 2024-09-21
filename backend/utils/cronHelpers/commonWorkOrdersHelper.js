import logger from "../../config/logger/winston-logger/loggerConfig.js";
import AssignedWorkOrder from '../../services/assignedWorkOrdersService.js';
import CronService from '../../services/cronService.js';
import moment from 'moment-timezone';

export const getWorkOrderRequestValidation = async (workOrder, cron) => {
    const paymentSatisfied = await isPaymentSatisfied(workOrder.pay, cron);
    const scheduleSatisfied = await isScheduleSatisfied(workOrder.schedule, cron);
    return {
        isValid: paymentSatisfied && scheduleSatisfied,
        isPaymentValid: paymentSatisfied,
        isScheduleValid: scheduleSatisfied,
    }
}

export const isPaymentSatisfied = async (workOrderPayment, cron) => {
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

export const isScheduleSatisfied = async (workOrderSchedule, cron) => {
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

export const outSideOfOffDays = async (workOrderId, cron, workOrderStartUtc, workOrderEndUtc) => {
    const workOrderDayNames = await getWorkOrderDayNames(workOrderStartUtc, workOrderEndUtc, cron.timeZone);
    if (workOrderDayNames.every(day => cron.offDays.includes(day))) {
        console.log(`off day conflict, id # ${workOrderId}`);
        return false;
    }

    return true;
}

export const getWorkOrderDayNames = async (workOrderStartDayTimeUtc, workOrderEndDayTimeUtc, timeZone) => {
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

export const outSideOfPlannedTimeOff = async (workOrderId, cron, workOrderStart, workOrderEnd) => {
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

export const checkOverlappingWithAssignedWorkOrders = async (workOrderId, workOrderStart, workOrderEnd, mode) => {
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

export const isInsideWorkingWindow = async (workOrderId, cron, mode, workOrderStart, workOrderEnd) => {
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

// Helper function to add hours to a date and handle day rollover
export const addHoursToDate = async (date, hoursToAdd) => {
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
export const adjustForOverlap = async (potentialStartTime, potentialEndTime, overlappedWorkOrderSchedule, workOrderSchedule) => {
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


// Function to request a work order
export const requestWorkOrders = async (workOrderId, cronId, userId, actingUserId, accessToken) => {
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
export const counterOfferWorkOrders = async (workOrderId, cronId, userId, actingUserId, accessToken, payload) => {
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