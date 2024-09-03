import cron from 'node-cron';
import logger from "../config/logger/winston-logger/loggerConfig.js";
import { fetchAllUsers } from '../service/userService.js';
import { fetchIntegrationByUserId, refreshAccessTokenByUserId } from '../service/integrationService.js';

// Will run every 23 hours 55 minutes
cron.schedule('55 */23 * * *', async () => {
// cron.schedule('* * * * *', async () => {
    const currentDateTime = new Date().toLocaleString();
    console.log(`Access-token updating cron running at: ${currentDateTime}`);
    logger.info(`Access-token updating cron running at: ${currentDateTime}`);
    // Add your cron job logic here
    const users = await fetchAllUsers();
    users.map(async (user) => {
        if (user.blocked) {
            return;
        }
        const integration = await fetchIntegrationByUserId(user.userId);
        if (integration.disabled) {
            return;
        }
        // renew access-token using refresh-token
        // Enable when want to test or go LIVE
        const refreshedToken = await refreshAccessTokenByUserId(user.userId);
        if (refreshedToken) {
            logger.info(`Successfully re-generated access-token using refresh-token for userId: ${user.userId} at: ${currentDateTime}`);
        } else {
            logger.error(`Failed to re-generate access-token using refresh-token for userId: ${user.userId} at: ${currentDateTime}`);
        }
    });

});

export default cron;
