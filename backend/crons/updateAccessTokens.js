import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';

// Will run every 23 hours 55 minutes
cron.schedule('55 */23 * * *', async () => {
    if(process.env.DISABLED_AUTHENTICATION_CRONS === 'true') {
        return;
    }
    const cronName = 'updateAccessTokens';
    logger.info(`Cron job '${cronName}' started: updating access token using refresh token.`, {cron: cronName});
    const userService = new UserService();
    const adminUsers = await userService.fetchAllAdminUsers();
    adminUsers.map(async (user) => {
        const integrationService = new IntegrationService(user.userId);
        if (user.blocked || !user.isActive || !user.isFnServiceCompanyAdmin) {
            // Ignore silently since this is not an appropriate service company admin of Field Nation
            // logger.debug(`User is blocked or not active yet, userId: ${user.userId}`, {cron: cronName});
            return;
        }
        const integration = await integrationService.fetchIntegration();
        if (!integration || integration.disabled) {
            logger.debug(`No integration found for userId: ${user.userId}`, {cron: cronName});
            return;
        }
        // renew access-token using refresh-token
        // Enable when want to test or go LIVE
        const refreshedToken = await integrationService.refreshAccessToken();
        if (refreshedToken) {
            logger.info(`Successfully refreshed access-token for userId: ${user.userId}`, {cron: cronName});
        } else {
            logger.error(`Failed to refresh access-token for userId: ${user.userId}`, {cron: cronName});
        }
    });

});

export default cron;
