import AssignedWorkOrder from '../../services/assignedWorkOrdersService.js';
import { isInsideWorkingWindow, outSideOfPlannedTimeOff, outSideOfOffDays, checkOverlappingWithAssignedWorkOrders, adjustForOverlap } from '../cronHelpers/commonWorkOrdersHelper.js';
import moment from 'moment-timezone';

// Todo: fetch the note from cron
export const getCounterOfferNote = async (isPaymentValid, isScheduleValid, cron) => {
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

export const getNextAvailableTimeSchedule = async (workOrderSchedule, cron) => {
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