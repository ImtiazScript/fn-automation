import moment from 'moment-timezone';

export const localToUtc = (localTime, timeZone) => {
    const localDate = moment.tz(localTime, timeZone);
    return localDate.utc().format();
}

export const utcToLocal = (utcTime, timeZone) => {
    const utcDate = moment.utc(utcTime);
    return utcDate.tz(timeZone).format();
}

export const localTimeToUtcTime = (localTime, timeZone) => {
    const [hours, minutes] = localTime.split(':');
    const localDateTime = moment.tz({ hour: hours, minute: minutes }, timeZone);
    return localDateTime.utc().format('HH:mm');
}

export const utcTimeToLocalTime = (utcTime, timeZone) => {
    const [hours, minutes] = utcTime.split(':');
    const utcDateTime = moment.utc({ hour: hours, minute: minutes });
    return utcDateTime.tz(timeZone).format('HH:mm');
}