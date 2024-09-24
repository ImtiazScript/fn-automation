import moment from 'moment-timezone';


/**
 * Converts local time to UTC time based on the specified time zone.
 *
 * @function localToUtc
 * @param {string|Date} localTime - The local time to be converted, can be a string or Date object.
 * @param {string} timeZone - The time zone to use for the conversion (e.g., 'America/New_York').
 * 
 * @returns {string} The UTC time in ISO 8601 format.
 *
 * @example
 * const utcTime = localToUtc('2024-09-23T12:00:00', 'America/New_York');
 * console.log(utcTime); // Outputs the corresponding UTC time
 */
export const localToUtc = (localTime, timeZone = 'America/Chicago') => {
    const localDate = moment.tz(localTime, timeZone);
    return localDate.utc().format();
}


/**
 * Converts UTC time to local time based on the specified time zone.
 *
 * @function utcToLocal
 * @param {string|Date} utcTime - The UTC time to be converted, can be a string or Date object.
 * @param {string} timeZone - The time zone to use for the conversion (e.g., 'America/New_York').
 * 
 * @returns {string} The local time in the specified time zone in ISO 8601 format.
 *
 * @example
 * const localTime = utcToLocal('2024-09-23T16:00:00Z', 'America/New_York');
 * console.log(localTime); // Outputs the corresponding local time
 */
export const utcToLocal = (utcTime, timeZone = 'America/Chicago') => {
    const utcDate = moment.utc(utcTime);
    return utcDate.tz(timeZone).format();
}


/**
 * Converts local time (HH:mm format) to UTC time based on the specified time zone.
 *
 * @function localTimeToUtcTime
 * @param {string} localTime - The local time in HH:mm format (e.g., '14:30').
 * @param {string} timeZone - The time zone to use for the conversion (e.g., 'America/New_York').
 * 
 * @returns {string} The corresponding UTC time in HH:mm format.
 *
 * @example
 * const utcTime = localTimeToUtcTime('14:30', 'America/New_York');
 * console.log(utcTime); // Outputs the corresponding UTC time
 */
export const localTimeToUtcTime = (localTime, timeZone = 'America/Chicago') => {
    const [hours, minutes] = localTime.split(':');
    const localDateTime = moment.tz({ hour: hours, minute: minutes }, timeZone);
    return localDateTime.utc().format('HH:mm');
}


/**
 * Converts UTC time (HH:mm format) to local time based on the specified time zone.
 *
 * @function utcTimeToLocalTime
 * @param {string} utcTime - The UTC time in HH:mm format (e.g., '18:30').
 * @param {string} timeZone - The time zone to use for the conversion (e.g., 'America/New_York').
 * 
 * @returns {string} The corresponding local time in HH:mm format.
 *
 * @example
 * const localTime = utcTimeToLocalTime('18:30', 'America/New_York');
 * console.log(localTime); // Outputs the corresponding local time
 */
export const utcTimeToLocalTime = (utcTime, timeZone = 'America/Chicago') => {
    const [hours, minutes] = utcTime.split(':');
    const utcDateTime = moment.utc({ hour: hours, minute: minutes });
    return utcDateTime.tz(timeZone).format('HH:mm');
}