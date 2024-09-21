//? ===================================================== General Routes Controller =====================================================
import moment from 'moment-timezone';

/*
   # Desc: Server Health Check Route
   # Route: GET /health
   # Access: PUBLIC
*/

const getServerHealth = (req, res) => {
  const currentDate =  moment.utc().toDate();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "UTC",
  };
  const formattedDate = currentDate.toLocaleString("en-US", options);

  res.status(200).json({
    status: `${process.env.APPLICATION_NAME} and Systems are Up & Running.`,
    dateTime: formattedDate,
  });

}



export { getServerHealth };
