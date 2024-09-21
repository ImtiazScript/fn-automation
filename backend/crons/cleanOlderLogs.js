import cron from 'node-cron';
import mongoose from 'mongoose';
import logger from '../config/logger/winston-logger/loggerConfig.js';
import moment from 'moment-timezone';

// Cron job to delete logs older than 7 days, runs every day at 23:55
cron.schedule('55 */23 * * *', async () => {
    if(process.env.DISABLED_CRONS === 'true') {
        return;
    }
    const logRetentionDays = process.env.LOG_RETENTION_DAYS ? parseInt(process.env.LOG_RETENTION_DAYS) : 7;
    const currentDateTime = moment.utc().toDate().toLocaleString();
    logger.info(`CLEAN LOG:: Older than ${logRetentionDays} days log deletion cron running at: ${currentDateTime}`);

    try {
        // Calculate the date 7 days ago
        const sevenDaysAgo = moment.utc(moment.utc().toDate() - logRetentionDays * 24 * 60 * 60 * 1000).toDate();

        // Define the Log model
        const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({}, { strict: false, collection: 'server_logs' }));

        // Delete logs older than 7 days
        const result = await Log.deleteMany({ timestamp: { $lt: sevenDaysAgo } });

        if (result.deletedCount > 0) {
            logger.info(`CLEAN LOG:: Successfully deleted ${result.deletedCount} logs older than ${logRetentionDays} days at: ${currentDateTime}`);
        } else {
            logger.info(`CLEAN LOG:: No logs found older than ${logRetentionDays} days at: ${currentDateTime}`);
        }
    } catch (error) {
        logger.error(`CLEAN LOG:: Failed to delete logs: ${error.message}`);
    }
});

export default cron;
