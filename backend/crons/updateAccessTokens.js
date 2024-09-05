import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import UserService from '../services/userService.js';
import IntegrationService from '../services/integrationService.js';

// Will run every 23 hours 55 minutes
cron.schedule('55 */23 * * *', async () => {
    // cron.schedule('* * * * *', async () => {
    const currentDateTime = new Date().toLocaleString();
    console.log(`Access-token updating cron running at: ${currentDateTime}`);
    logger.info(`Access-token updating cron running at: ${currentDateTime}`);
    // Add your cron job logic here
    const userService = new UserService();
    const users = await userService.fetchAllUsers();
    users.map(async (user) => {
        const integrationService = new IntegrationService(user.userId);
        if (user.blocked) {
            return;
        }
        const integration = integrationService.fetchIntegration();
        if (!integration || integration.disabled) {
            return;
        }
        // renew access-token using refresh-token
        // Enable when want to test or go LIVE
        const refreshedToken = await integrationService.refreshAccessToken();
        if (refreshedToken) {
            logger.info(`Successfully re-generated access-token using refresh-token for userId: ${user.userId} at: ${currentDateTime}`);
        } else {
            logger.error(`Failed to re-generate access-token using refresh-token for userId: ${user.userId} at: ${currentDateTime}`);
        }
    });

});

export default cron;
