import AssignedWorkOrder from '../../services/assignedWorkOrdersService.js';
import { isInsideWorkingWindow, outSideOfPlannedTimeOff, outSideOfOffDays, checkOverlappingWithAssignedWorkOrders, adjustForOverlap } from '../cronHelpers/commonWorkOrdersHelper.js';
import moment from 'moment-timezone';


/**
 * Generates a counter offer note based on the validity of payment and schedule.
 *
 * @async
 * @function getCounterOfferNote
 * @param {boolean} isPaymentValid - Indicates if the payment is valid.
 * @param {boolean} isScheduleValid - Indicates if the schedule is valid.
 * @param {Object} cron - The cron object (not used in the current implementation but included for potential future use).
 * @returns {Promise<string>} A promise that resolves to the generated counter offer note.
 *
 * @example
 * const note = await getCounterOfferNote(false, true, cron);
 * console.log(note); // "Payment counter offer note"
 */
export const getCounterOfferNote = async (isPaymentValid, isScheduleValid, cron) => {
    let note = '';
    if (!isPaymentValid && !isScheduleValid) {
        note = cron.scheduleAndPayChangeNote;
    } else if (!isPaymentValid) {
        note = cron.paymentChangeNote;
    } else if (!isScheduleValid) {
        note = cron.scheduleChangeNote;
    }

    return note;
}


/**
 * Generates a payment counter offer request payload based on the type of payment and cron details.
 *
 * @async
 * @function getPaymentCounterOfferRequestPayload
 * @param {Object} workOrderPayment - The payment details for the work order.
 * @param {string} workOrderPayment.type - The type of payment (fixed, hourly, device, blended).
 * @param {Object} workOrderPayment.base - The base payment details.
 * @param {Object} workOrderPayment.base.units - The units for the base payment.
 * @param {Object} workOrderPayment.additional - The additional payment details.
 * @param {Object} cron - The cron object containing payment information.
 * @param {number} cron.fixedPayment - The fixed payment amount.
 * @param {number} cron.hourlyPayment - The hourly payment amount.
 * @param {number} cron.perDevicePayment - The payment amount per device.
 * @param {number} cron.firstHourlyPayment - The first hourly payment amount for blended rates.
 * @param {number} cron.additionalHourlyPayment - The additional hourly payment amount for blended rates.
 * @returns {Promise<Object>} A promise that resolves to the payment request payload.
 *
 * @example
 * const payload = await getPaymentCounterOfferRequestPayload(workOrderPayment, cron);
 * console.log(payload);
 */
export const getPaymentCounterOfferRequestPayload = async (workOrderPayment, cron) => {
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


/**
 * Generates a schedule counter offer request payload based on the work order schedule and cron details.
 *
 * @async
 * @function getScheduleCounterOfferRequestPayload
 * @param {Object} workOrderSchedule - The schedule details for the work order.
 * @param {Object} workOrderSchedule.time_zone - The time zone information for the work order.
 * @param {Object} workOrderSchedule.service_window - The service window details.
 * @param {string} workOrderSchedule.service_window.mode - The mode of the service window (exact, hours, between).
 * @param {Object} cron - The cron object containing scheduling information.
 * @returns {Promise<Object>} A promise that resolves to the schedule request payload.
 *
 * @example
 * const payload = await getScheduleCounterOfferRequestPayload(workOrderSchedule, cron);
 * console.log(payload);
 */
export const getScheduleCounterOfferRequestPayload = async (workOrderSchedule, cron) => {
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


/**
 * Finds the next available time slot for a work order schedule that does not conflict with off days, planned time off, or already assigned schedules.
 *
 * @async
 * @function getNextAvailableTimeSchedule
 * @param {Object} workOrderSchedule - The schedule details for the work order.
 * @param {string} workOrderSchedule.work_order_id - The ID of the work order.
 * @param {Object} workOrderSchedule.service_window - The service window details.
 * @param {Object} cron - The cron object containing scheduling information.
 * @param {string} cron.workingWindowStartAt - The start time of the working window in HH:mm format.
 * @param {string} cron.workingWindowEndAt - The end time of the working window in HH:mm format.
 * @returns {Promise<Object>} A promise that resolves to an object containing the next available start and end times.
 *
 * @example
 * const { startTime, endTime } = await getNextAvailableTimeSchedule(workOrderSchedule, cron);
 * console.log(`Next available slot: ${startTime} to ${endTime}`);
 */
export const getNextAvailableTimeSchedule = async (workOrderSchedule, cron) => {
    const workOrderId = workOrderSchedule.work_order_id;
    const workingWindowStartTime = cron.workingWindowStartAt.split(':');
    const workingWindowEndTime = cron.workingWindowEndAt.split(':');

    let startTime;
    let endTime;
    const today = moment.utc().toDate();

    // Start with the work order's start time
    let potentialStartTime = moment.utc(workOrderSchedule.service_window.start.utc).toDate();
    let potentialEndTime = workOrderSchedule?.service_window?.mode === 'exact' ? potentialStartTime : moment.utc(workOrderSchedule.service_window.end.utc).toDate();

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