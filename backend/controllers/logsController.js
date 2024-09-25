//? ===================================================== Logs Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import moment from 'moment-timezone';
import { NotFoundError, InternalServerError } from '@emtiaj/custom-errors';


/*
   # Desc: Get all crons following pagination
   # Route: GET /api/v1/logs/get-logs/from/:fromDate/until/:untilDate/page/:page
   # Access: PRIVATE
  */
const getLogs = asyncHandler(async (req, res) => {
  try {
    const { fromDate, untilDate, page } = req.params;
    // Define the log model based on the MongoDB collection schema
    const Log = mongoose.models.Log || mongoose.model('Log', new mongoose.Schema({}, { strict: false, collection: 'server_logs' }));
    // Define the query options
    const from = (fromDate && fromDate !== '0') ? moment.utc(fromDate).toDate() : moment.utc(moment.utc().toDate() - 168 * 60 * 60 * 1000).toDate();
    const until = (untilDate && untilDate !== '0') ? moment.utc(untilDate).toDate() : moment.utc().toDate();
    const limit = req.body.limit ? parseInt(req.body.limit) : 50;
    const start = page > 1 ? (page - 1) * limit : 0;
    const sort = { timestamp: -1 }; // Sort by latest first

    const totalLogs = await Log.countDocuments({ timestamp: { $gte: from, $lte: until } });
    // Query the logs from MongoDB
    const logs = await Log.find({ timestamp: { $gte: from, $lte: until } })
      .select('message timestamp level meta')
      .skip(start)
      .limit(limit)
      .sort(sort)
      .lean();
    res.status(200).json({ logs, totalLogs });
  } catch (error) {
    throw new InternalServerError("Failed to fetch logs.");
  }
});


/*
   # Desc: Get cron detail by id
   # Route: GET /api/v1/logs/get-log/:id
   # Access: PRIVATE
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
      throw new NotFoundError("Not found log.");
    }
    res.status(200).json({ log });
  } catch (error) {
    throw new InternalServerError("Failed to fetch log.");
  }
});

export {
  getLogs,
  getLogById,
};
