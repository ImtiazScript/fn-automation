import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';

// Will run every 23 hours 55 minutes
cron.schedule('55 */23 * * *', async () => {
    if(process.env.DISABLED_AUTHENTICATION_CRONS === 'true') {
        return;
    }
    const currentDateTime = moment.utc().toDate().toLocaleString();
    logger.info(`REFRESH ACCESS TOKEN:: Access-token updating cron running at: ${currentDateTime}`);
    const userService = new UserService();
    const adminUsers = await userService.fetchAllAdminUsers();
    adminUsers.map(async (user) => {
        const integrationService = new IntegrationService(user.userId);
        if (user.blocked || !user.isActive || !user.isFnServiceCompanyAdmin) {
            // Ignore silently since this is not an appropriate service company admin of Field Nation
            // logger.debug(`REFRESH ACCESS TOKEN:: User is blocked or not active yet, userId: ${user.userId}`);
            return;
        }
        const integration = await integrationService.fetchIntegration();
        if (!integration || integration.disabled) {
            logger.debug(`REFRESH ACCESS TOKEN:: No integration found for userId: ${user.userId}`);
            return;
        }
        // renew access-token using refresh-token
        // Enable when want to test or go LIVE
        const refreshedToken = await integrationService.refreshAccessToken();
        if (refreshedToken) {
            logger.info(`REFRESH ACCESS TOKEN:: Successfully refreshed access-token for userId: ${user.userId} at: ${currentDateTime}`);
        } else {
            logger.error(`REFRESH ACCESS TOKEN:: Failed to refresh access-token for userId: ${user.userId} at: ${currentDateTime}`);
        }
    });

});

export default cron;
