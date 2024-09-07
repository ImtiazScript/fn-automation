//? ===================================================== Logs Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import winston, { Logger, format } from "winston";

/**
 * Desc: Get all crons
 * Route: /api/v1/admin/get-logs
 */
const getLogs = asyncHandler(async (req, res) => {
  try {
    const { fromDate, untilDate, page } = req.params;
    // Define the log model based on the MongoDB collection schema
    const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({}, { strict: false, collection: 'server_logs' }));
    // Define the query options
    const from = (fromDate && fromDate !== '0') ? new Date(fromDate) : new Date(new Date() - 168 * 60 * 60 * 1000);
    const until = (untilDate && untilDate !== '0') ? new Date(untilDate) : new Date();
    const limit = req.body.limit ? parseInt(req.body.limit) : 50;
    const start = page > 1 ? (page - 1) * limit : 0;
    const sort = { timestamp: -1 }; // Sort by latest first

    const totalLogs = await Log.countDocuments({ timestamp: { $gte: from, $lte: until } });
    // Query the logs from MongoDB
    const logs = await Log.find({ timestamp: { $gte: from, $lte: until } })
      .select('message timestamp level')
      .skip(start)
      .limit(limit)
      .sort(sort)
      .lean();
    res.status(200).json({ logs, totalLogs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
  }
});

/**
 * Desc: Get single cron by cron id
 * Route: /api/v1/admin/get-log/:log-id
 */
const getLogById = asyncHandler(async (req, res) => {
  try {
    // Define the log model based on the MongoDB collection schema
    const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({}, { strict: false, collection: 'server_logs' }));
    // Get the log ID from the request parameters
    const { id } = req.params;
    // Query the log from MongoDB by its _id
    const log = await Log.findById(id).lean();
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    res.status(200).json({ log });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ message: 'Failed to fetch log', error: error.message });
  }
});

export {
  getLogs,
  getLogById,
};
