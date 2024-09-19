import React from 'react';
import { Form } from 'react-bootstrap';

const TimeZoneSelect = ({ onChange, selectedTimeZone }) => {
    const timeZoneOptions = [
        'America/New_York',    // Eastern Time (ET)
        'America/Detroit',     // Eastern Time (ET) - Michigan
        'America/Kentucky/Louisville', // Eastern Time (ET) - Kentucky
        'America/Indiana/Indianapolis', // Eastern Time (ET) - Indiana
        'America/Chicago',     // Central Time (CT)
        'America/Winnipeg',    // Central Time (CT) - Some parts of North Dakota, etc.
        'America/Menominee',   // Central Time (CT) - Michigan (Upper Peninsula)
        'America/Denver',      // Mountain Time (MT)
        'America/Boise',       // Mountain Time (MT) - Idaho
        'America/Phoenix',     // Mountain Time (MT) - Arizona (No Daylight Saving Time)
        'America/Los_Angeles', // Pacific Time (PT)
        'America/Anchorage',   // Alaska Time (AKT)
        'America/Adak',        // Aleutian Time (Hawaii-Aleutian Time Zone)
        'Pacific/Honolulu',    // Hawaii Time (HST) - No Daylight Saving Time
        'Pacific/Pago_Pago',   // Samoa Time Zone (American Samoa)
        'Pacific/Guam',        // Chamorro Time Zone (Guam)
        'Pacific/Saipan',      // Chamorro Time Zone (Northern Mariana Islands)
        'America/Port_of_Spain', // Atlantic Time (Puerto Rico)
        'America/St_Thomas'    // Atlantic Time (U.S. Virgin Islands)
        ];

    return (
        <Form.Group controlId="timeZone">
            <Form.Label>Time Zone</Form.Label>
            <Form.Control
                as="select"
                name="timeZone"
                value={selectedTimeZone || ''}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="" disabled>Select Time Zone</option>
                {timeZoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                        {tz}
                    </option>
                ))}
            </Form.Control>
        </Form.Group>
    );
};

export default TimeZoneSelect;
