import morgan from "morgan";
import logger from "./winston-logger/loggerConfig.js";

const morganLogger = () => {
  // Create a custom stream that writes to both Winston and console
  const dualStream = {
    write: (message) => {
      // Log to Winston
      // TODO:
      // Http logs are disabled by Imtiaz
      // logger.info(message.trim());
      // Log to console
      console.log(message.trim());
    },
  };

  // Use the custom stream with morgan middleware
  const httpLogger = morgan(
    // Customized the log format, to keep only necessary info. Keeping existing format commented for future reference
    // '[:date[web]] :remote-addr - :remote-user HTTP/:http-version :method :url STATUS: :status TotalTime: :total-time[digits]ms Content-length: :res[content-length] ":referrer" ":user-agent"',
    '[:date[web]] - Method: :method, Url: :url, Status: :status, TotalTime: :total-time[digits]ms, Referrer: ":referrer"',
    { stream: dualStream }
  );

  return httpLogger;
};

export default morganLogger;
