import logger from "../../config/logger/winston-logger/loggerConfig.js";
import AssignedWorkOrder from '../../services/assignedWorkOrdersService.js';
import CronService from '../../services/cronService.js';
import moment from 'moment-timezone';
import { makeRequest } from "../makeRequest.js";


/**
 * Validates a work order request by checking payment and schedule conditions.
 *
 * @async
 * @function getWorkOrderRequestValidation
 * @param {Object} workOrder - The work order to be validated.
 * @param {Object} cron - The cron configuration associated with the work order.
 * @param {Object} workOrder.pay - The payment details of the work order.
 * @param {Object} workOrder.schedule - The scheduling details of the work order.
 * @returns {Promise<Object>} A promise that resolves to an object containing validation results.
 * @returns {boolean} returns.isValid - Indicates if the work order is valid based on payment and schedule.
 * @returns {boolean} returns.isPaymentValid - Indicates if the payment conditions are satisfied.
 * @returns {boolean} returns.isScheduleValid - Indicates if the schedule conditions are satisfied.
 *
 * @example
 * const validation = await getWorkOrderRequestValidation(workOrder, cron);
 * if (validation.isValid) {
 *     console.log('Work order is valid.');
 * } else {
 *     console.log('Work order is invalid:', validation);
 * }
 */
export const getWorkOrderRequestValidation = async (workOrder, cron) => {
    const paymentSatisfied = await isPaymentSatisfied(workOrder.pay, cron);
    const scheduleSatisfied = await isScheduleSatisfied(workOrder.schedule, cron);
    return {
        isValid: paymentSatisfied && scheduleSatisfied,
        isPaymentValid: paymentSatisfied,
        isScheduleValid: scheduleSatisfied,
    }
}


/**
 * Checks if the payment conditions for a work order are satisfied based on the cron configuration.
 *
 * @async
 * @function isPaymentSatisfied
 * @param {Object} workOrderPayment - The payment details of the work order.
 * @param {Object} cron - The cron configuration associated with the work order.
 * @param {string} workOrderPayment.type - The type of payment (fixed, hourly, device, blended).
 * @param {Object} workOrderPayment.base - The base payment details.
 * @param {number} workOrderPayment.base.amount - The base amount for payment.
 * @param {Object} workOrderPayment.additional - The additional payment details (if applicable).
 * @param {number} workOrderPayment.additional.amount - The additional amount for payment.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the payment conditions are satisfied.
 *
 * @example
 * const isSatisfied = await isPaymentSatisfied(workOrderPayment, cron);
 * if (isSatisfied) {
 *     console.log('Payment conditions are satisfied.');
 * } else {
 *     console.log('Payment conditions are not satisfied.');
 * }
 */
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
        const firstHourly = workOrderPayment.base.amount / workOrderPayment.base.base;
        const additionalHourly = workOrderPayment.additional.amount / workOrderPayment.additional.base;

        return (firstHourly >= cron.firstHourlyPayment && additionalHourly >= cron.additionalHourlyPayment);
    }

    return false;
}


/**
 * Checks if the scheduling conditions for a work order are satisfied based on the cron configuration.
 *
 * @async
 * @function isScheduleSatisfied
 * @param {Object} workOrderSchedule - The scheduling details of the work order.
 * @param {Object} cron - The cron configuration associated with the work order.
 * @param {Object} workOrderSchedule.service_window - The service window details of the work order.
 * @param {string} workOrderSchedule.service_window.mode - The scheduling mode (exact, hours, between, etc.).
 * @param {Object} workOrderSchedule.service_window.start - The start time of the service window.
 * @param {Object} workOrderSchedule.service_window.start.utc - The start time in UTC.
 * @param {Object} workOrderSchedule.service_window.end - The end time of the service window (optional).
 * @param {Object} workOrderSchedule.service_window.end.utc - The end time in UTC.
 * @param {number} workOrderSchedule.est_labor_hours - Estimated labor hours for the work order.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the scheduling conditions are satisfied.
 *
 * @example
 * const isSatisfied = await isScheduleSatisfied(workOrderSchedule, cron);
 * if (isSatisfied) {
 *     console.log('Schedule conditions are satisfied.');
 * } else {
 *     console.log('Schedule conditions are not satisfied.');
 * }
 */
export const isScheduleSatisfied = async (workOrderSchedule, cron) => {
    const {
        mode,
        start: { utc: workOrderStartUtc },
        // end: { utc: workOrderEndUtc } = {},
        est_labor_hours: estLaborHours = 0,
    } = workOrderSchedule.service_window;
    const workOrderEndUtc = mode === 'exact' ? workOrderStartUtc : workOrderSchedule?.service_window?.end?.utc;

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


/**
 * Checks if the work order's scheduled days fall outside of the defined off days in the cron configuration.
 *
 * @async
 * @function outSideOfOffDays
 * @param {string} workOrderId - The ID of the work order.
 * @param {Object} cron - The cron configuration that includes off days and time zone.
 * @param {Object} cron.offDays - An array of off days (day names).
 * @param {string} cron.timeZone - The time zone used for determining work order days.
 * @param {string} workOrderStartUtc - The start time of the work order in UTC.
 * @param {string} workOrderEndUtc - The end time of the work order in UTC.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the work order is scheduled on an off day.
 *
 * @example
 * const isOutsideOffDays = await outSideOfOffDays(workOrderId, cron, workOrderStartUtc, workOrderEndUtc);
 * if (!isOutsideOffDays) {
 *     console.log('Work order is scheduled on an off day.');
 * } else {
 *     console.log('Work order is scheduled on a valid day.');
 * }
 */
export const outSideOfOffDays = async (workOrderId, cron, workOrderStartUtc, workOrderEndUtc) => {
    const workOrderDayNames = await getWorkOrderDayNames(workOrderStartUtc, workOrderEndUtc, cron.timeZone);
    if (workOrderDayNames.every(day => cron.offDays.includes(day))) {
        console.log(
            `\n Off-day conflict, #WO ${workOrderId}:\n` +
            `Work order days: ${workOrderDayNames.join(', ')}\n` +
            `Off days: ${cron.offDays.join(', ')}\n`
        );
        return false;
    }

    return true;
}


/**
 * Retrieves the names of the days within the specified date range, converted to the local time zone.
 *
 * @async
 * @function getWorkOrderDayNames
 * @param {string} workOrderStartDayTimeUtc - The start time of the work order in UTC format.
 * @param {string} workOrderEndDayTimeUtc - The end time of the work order in UTC format.
 * @param {string} timeZone - The time zone used to convert the UTC time.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique day names (e.g., ["Monday", "Tuesday"]).
 *
 * @example
 * const dayNames = await getWorkOrderDayNames(workOrderStartDayTimeUtc, workOrderEndDayTimeUtc, timeZone);
 * console.log(dayNames); // Output: ["Monday", "Tuesday", ...]
 */
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


/**
 * Checks if a work order's scheduled time conflicts with planned time off.
 *
 * @async
 * @function outSideOfPlannedTimeOff
 * @param {string} workOrderId - The ID of the work order being checked.
 * @param {Object} cron - The cron object containing time off information.
 * @param {Date} workOrderStart - The start time of the work order.
 * @param {Date} workOrderEnd - The end time of the work order.
 * @returns {Promise<boolean>} A promise that resolves to true if there is no conflict, false if there is a conflict.
 *
 * @example
 * const isOutside = await outSideOfPlannedTimeOff(workOrderId, cron, workOrderStart, workOrderEnd);
 * console.log(isOutside); // Output: true or false
 */
export const outSideOfPlannedTimeOff = async (workOrderId, cron, workOrderStart, workOrderEnd) => {
    if (cron.timeOffStartAt && cron.timeOffEndAt) {
        const timeOffStart = moment.utc(cron.timeOffStartAt).toDate();
        const timeOffEnd = moment.utc(cron.timeOffEndAt).toDate();
        if (workOrderStart >= timeOffStart && workOrderEnd <= timeOffEnd) {
            console.log(
                `\n Planned time-off conflict, #WO ${workOrderId}:\n` +
                `Planned time-off start: ${timeOffStart} --> Planned time-off end: ${timeOffEnd}\n` +
                `Work order start: ${workOrderStart} --> Work order end: ${workOrderEnd}\n`
            );
            return false;
        }
    }
    return true;
}


/**
 * Checks for overlapping schedules with already assigned work orders.
 *
 * @async
 * @function checkOverlappingWithAssignedWorkOrders
 * @param {string} workOrderId - The ID of the work order being checked for overlaps.
 * @param {Date} workOrderStart - The start time of the work order.
 * @param {Date} workOrderEnd - The end time of the work order.
 * @param {string} mode - The mode for checking overlaps. Can be 'exact', 'hours', or 'between'.
 * @returns {Promise<{isOverlapped: boolean, overlappedWorkOrderId: number}>} An object indicating whether there is an overlap and the ID of the overlapping work order if found.
 *
 * @example
 * const overlapCheck = await checkOverlappingWithAssignedWorkOrders(workOrderId, workOrderStart, workOrderEnd, mode);
 * console.log(overlapCheck.isOverlapped); // Output: true or false
 * console.log(overlapCheck.overlappedWorkOrderId); // Output: ID of the overlapping work order or 0
 */
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


/**
 * Checks if a work order's scheduled time falls within the designated working window.
 *
 * @async
 * @function isInsideWorkingWindow
 * @param {string} workOrderId - The ID of the work order being checked.
 * @param {Object} cron - The cron configuration containing working window times.
 * @param {string} mode - The mode for checking. Can be 'exact', 'hours', or 'between'.
 * @param {Date} workOrderStart - The start time of the work order.
 * @param {Date} workOrderEnd - The end time of the work order.
 * @returns {Promise<boolean>} Returns true if the work order is within the working window; false otherwise.
 *
 * @example
 * const isInWindow = await isInsideWorkingWindow(workOrderId, cron, mode, workOrderStart, workOrderEnd);
 * console.log(isInWindow); // Output: true or false
 */
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
                console.log(
                    `\n Working window conflict, #WO ${workOrderId}:\n` +
                    `Working Window Start: ${workingWindowStart} --> Working Window End: ${workingWindowEnd}\n` +
                    `Workorder Start: ${workOrderWindowStart} --> Workorder End: ${workOrderWindowEnd}\n`
                );
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


/**
 * Adds a specified number of hours to a given date, handling day rollover if necessary.
 *
 * @async
 * @function addHoursToDate
 * @param {Date} date - The original date to which hours will be added.
 * @param {number} hoursToAdd - The number of hours to add to the original date.
 * @returns {Promise<Date>} A promise that resolves to the new date after adding the specified hours.
 *
 * @example
 * const updatedDate = await addHoursToDate(new Date(), 5);
 * console.log(updatedDate); // Output: The updated date with 5 hours added
 */
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


/**
 * Adjusts the start and end times of a work order schedule to avoid overlap
 * with an already assigned work order schedule, taking into account estimated labor hours.
 *
 * @async
 * @function adjustForOverlap
 * @param {Date} potentialStartTime - The initially proposed start time for the work order.
 * @param {Date} potentialEndTime - The initially proposed end time for the work order.
 * @param {Object} overlappedWorkOrderSchedule - The schedule of the overlapping work order.
 * @param {Object} workOrderSchedule - The schedule of the work order being adjusted.
 * @returns {Promise<Object>} A promise that resolves to an object containing the adjusted start and end times.
 *
 * @example
 * const adjustedTimes = await adjustForOverlap(potentialStart, potentialEnd, overlappedSchedule, workOrderSchedule);
 * console.log(adjustedTimes); // Output: { startTime: Date, endTime: Date }
 */
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


/**
 * Requests a work order on behalf of a user and updates the associated cron's requested work orders.
 *
 * @async
 * @function requestWorkOrders
 * @param {string} workOrderId - The ID of the work order to be requested.
 * @param {string} cronId - The ID of the cron associated with the request.
 * @param {string} userId - The ID of the user making the request.
 * @param {string} actingUserId - The ID of the acting user associated with the request.
 * @param {string} accessToken - The access token for authentication with the API.
 * @returns {Promise<void>} A promise that resolves when the request is completed.
 *
 * @example
 * await requestWorkOrders('workOrder123', 'cron456', 'user789', 'actingUser321', 'accessTokenXYZ', 'availableWorkOrders');
 */
export const requestWorkOrders = async (workOrderId, cronId, userId, actingUserId, accessToken, cronName) => {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/${workOrderId}/requests?acting_user_id=${actingUserId}&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, {}, {}, userId);
        if (response) {
            logger.info(`successfully requested work order #${workOrderId} by user id: ${userId}, field nation user id: ${actingUserId}`, {cron: cronName});

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`Failed to request work order #${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`, {cron: cronName});
    }
}


/**
 * Sends a counter-offer for a specified work order and updates the associated cron's requested work orders.
 *
 * @async
 * @function counterOfferWorkOrders
 * @param {string} workOrderId - The ID of the work order to counter-offer.
 * @param {string} cronId - The ID of the cron associated with the counter-offer.
 * @param {string} userId - The ID of the user making the counter-offer.
 * @param {string} actingUserId - The ID of the acting user associated with the counter-offer.
 * @param {string} accessToken - The access token for authentication with the API.
 * @param {Object} payload - The payload containing the counter-offer details.
 * @returns {Promise<void>} A promise that resolves when the counter-offer request is completed.
 *
 * @example
 * await counterOfferWorkOrders('workOrder123', 'cron456', 'user789', 'actingUser321', 'accessTokenXYZ', payload, cronName );
 */
export const counterOfferWorkOrders = async (workOrderId, cronId, userId, actingUserId, accessToken, payload, cronName) => {
    const requestUrl = `${process.env.FN_BASE_URL}/api/rest/v2/workorders/${workOrderId}/requests?acting_user_id=${actingUserId}&access_token=${accessToken}`;
    const cronService = new CronService(userId);

    try {
        const response = await makeRequest('POST', requestUrl, {}, payload, {}, userId);
        if (response) {
            logger.info(`Successfully counter-offerred work order #${workOrderId}  by user id: ${userId}, field nation user id: ${actingUserId}`, {cron: cronName});

            // Update the cron's total requested and requested work order IDs
            await cronService.updateRequestedWorkOrders(cronId, workOrderId);
        }
    } catch (error) {
        logger.error(`Failed to counter-offer work order #${workOrderId} for user id: ${userId}, field nation user id: ${actingUserId} : ${error.message}`, {cron: cronName});
    }
}


export const logWorkOrderOperation = async (message, workOrder, payload = {}, cron = '') => {
    const logMetaData = {
        workorder_id: workOrder.id,
        title: workOrder.title,
        schedule: workOrder.schedule,
        pay: workOrder.pay,
        location: workOrder.location,
        types_of_work: workOrder.types_of_work,
    };
    if (payload) {
        logMetaData.payload = payload;
    }
    if (cron) {
        logMetaData.cron = cron;
    }

    logger.info(message, logMetaData);
}