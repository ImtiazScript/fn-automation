//? ===================================================== Cron Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import Cron from "../models/cronModel.js";
import { BadRequestError, NotAuthorizedError } from "base-error-handler";
import { localToUtc, utcToLocal, localTimeToUtcTime, utcTimeToLocalTime } from "../utils/timeZoneConverter.js";

/*
  # Desc: Add a new cron
  # Route: POST /api/v1/admin/add-cron
  # Access: PRIVATE
*/
const addCron = asyncHandler(async (req, res) => {
  try {
    const { userId, centerZip, cronStartAt, cronEndAt, workingWindowStartAt, workingWindowEndAt, drivingRadius, typesOfWorkOrder, status,
      isFixed, fixedPayment, isHourly, hourlyPayment, isPerDevice, perDevicePayment, isBlended, firstHourlyPayment, additionalHourlyPayment,
      isEnabledCounterOffer, offDays, timeOffStartAt, timeOffEndAt, timeZone } = req.body;
    const cron = await Cron.create({
      userId: req.user.isAdmin ? userId: req.user.userId,
      centerZip: centerZip,
      cronStartAt: localToUtc(cronStartAt, timeZone),
      cronEndAt: localToUtc(cronEndAt, timeZone),
      workingWindowStartAt: localTimeToUtcTime(workingWindowStartAt, timeZone),
      workingWindowEndAt: localTimeToUtcTime(workingWindowEndAt, timeZone),
      drivingRadius: drivingRadius,
      requestedWoIds: [],
      totalRequested: 0,
      typesOfWorkOrder: typesOfWorkOrder,
      status: status,
      isFixed: isFixed,
      fixedPayment: fixedPayment,
      isHourly: isHourly,
      hourlyPayment: hourlyPayment,
      isPerDevice: isPerDevice,
      perDevicePayment: perDevicePayment,
      isBlended: isBlended,
      firstHourlyPayment: firstHourlyPayment,
      additionalHourlyPayment: additionalHourlyPayment,
      isEnabledCounterOffer: isEnabledCounterOffer,
      offDays: offDays,
      timeOffStartAt: localToUtc(timeOffStartAt, timeZone),
      timeOffEndAt: localToUtc(timeOffEndAt, timeZone),
      timeZone: timeZone,
      deleted: false,
    });
    if (cron) {
      res.status(201).json({ message: "Successfully added the cron", cron: cron });
    }
  } catch (error) {
    console.error("Error adding cron:", error.message); // Print the error message to the console
    res.status(500).json({ message: "Failed to add cron", error: error.message }); // Send a response with the error message
  }
});


/*
   # Desc: Update an existing cron
   # Route: PUT /api/v1/admin/update-cron
   # Access: PRIVATE
  */
const updateCron = asyncHandler(async (req, res) => {
  const { cronId, centerZip, cronStartAt, cronEndAt, workingWindowStartAt, workingWindowEndAt, drivingRadius, requestedWoIds, totalRequested, typesOfWorkOrder, status,
    isFixed, fixedPayment, isHourly, hourlyPayment, isPerDevice, perDevicePayment, isBlended, firstHourlyPayment, additionalHourlyPayment, isEnabledCounterOffer, offDays,
    timeOffStartAt, timeOffEndAt, timeZone, deleted } = req.body;
  if (!cronId) {
    throw new BadRequestError("Cron id is missing in the request - cron updating failed.");
  }

  // Find the existing cron by Id
  const cronExist = await Cron.findOne({ cronId });
  if (req.user && !req.user.isAdmin && req.user.userId !== cronExist.userId) {
    throw new NotAuthorizedError("Authorization Error - you do not have permission to update this cron");
  }

  try {
    if (cronExist) {
      // Update only the fields that are provided in the request
      const updatedFields = {};
      if (centerZip !== undefined) updatedFields.centerZip = centerZip;
      if (cronStartAt !== undefined) updatedFields.cronStartAt = localToUtc(cronStartAt, timeZone);
      if (cronEndAt !== undefined) updatedFields.cronEndAt = localToUtc(cronEndAt, timeZone);
      if (workingWindowStartAt !== undefined) updatedFields.workingWindowStartAt = localTimeToUtcTime(workingWindowStartAt, timeZone);
      if (workingWindowEndAt !== undefined) updatedFields.workingWindowEndAt = localTimeToUtcTime(workingWindowEndAt, timeZone);
      if (drivingRadius !== undefined) updatedFields.drivingRadius = drivingRadius;
      if (requestedWoIds !== undefined) updatedFields.requestedWoIds = requestedWoIds;
      if (totalRequested !== undefined) updatedFields.totalRequested = totalRequested;
      if (typesOfWorkOrder !== undefined) updatedFields.typesOfWorkOrder = typesOfWorkOrder;
      if (status !== undefined) updatedFields.status = status;
      if (isFixed !== undefined) updatedFields.isFixed = isFixed;
      if (fixedPayment !== undefined) updatedFields.fixedPayment = fixedPayment;
      if (isHourly !== undefined) updatedFields.isHourly = isHourly;
      if (hourlyPayment !== undefined) updatedFields.hourlyPayment = hourlyPayment;
      if (isPerDevice !== undefined) updatedFields.isPerDevice = isPerDevice;
      if (perDevicePayment !== undefined) updatedFields.perDevicePayment = perDevicePayment;
      if (isBlended !== undefined) updatedFields.isBlended = isBlended;
      if (firstHourlyPayment !== undefined) updatedFields.firstHourlyPayment = firstHourlyPayment;
      if (additionalHourlyPayment !== undefined) updatedFields.additionalHourlyPayment = additionalHourlyPayment;
      if (isEnabledCounterOffer !== undefined) updatedFields.isEnabledCounterOffer = isEnabledCounterOffer;
      if (offDays !== undefined) updatedFields.offDays = offDays;
      if (timeOffStartAt !== undefined) updatedFields.timeOffStartAt = localToUtc(timeOffStartAt, timeZone);
      if (timeOffEndAt !== undefined) updatedFields.timeOffEndAt = localToUtc(timeOffEndAt, timeZone);
      if (timeZone !== undefined) updatedFields.timeZone = timeZone;
      if (deleted !== undefined) updatedFields.deleted = deleted;

      // Perform the update
      const updatedCron = await Cron.findByIdAndUpdate(cronExist._id, updatedFields, { new: true });
      res.status(200).json({ message: "Successfully updated the cron", cron: updatedCron });
    } else {
      throw new BadRequestError("Cron not found - updating failed.");
    }
  } catch (error) {
    console.error("Error updating cron:", error.message);
    res.status(500).json({ message: "Failed to update cron", error: error.message });
  }
});


/*
   # Desc: Get all crons
   # Route: PUT /api/v1/admin/get-crons
   # Access: PRIVATE
  */
const getAllCrons = asyncHandler(async (req, res) => {
  const { page } = req.params;
  const limit = 10;
  const start = page > 1 ? (page - 1) * limit : 0;
  const sort = { timestamp: -1 };

  const totalCrons = await Cron.countDocuments({
    $or: [
      { deleted: { $exists: false } },
      { deleted: false }
    ]});
  try {
    // Build match conditionally based on user role
    const matchCondition = req.user.isAdmin ? {} : { userId: req.user.userId };
    const cronsData = await Cron.aggregate([
        {
            $match: {
              ...matchCondition,
              $or: [
                { deleted: { $exists: false } },
                { deleted: false }
              ]
            } // Match based on user role
          },
      {
        $lookup: {
          from: 'users', // The collection name in MongoDB
          localField: 'userId',
          foreignField: 'userId',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true // This will keep crons even if there is no matching user
        }
      },
      {
        $project: {
            password: 0, // Exclude sensitive fields from userDetails
            'userDetails.password': 0,
            'userDetails.email': 0 // Exclude unnecessary fields
          }
      },
      {
        $sort: sort  // Sort by timestamp in descending order
      },
      {
        $skip: start  // Skip documents for pagination
      },
      {
        $limit: limit  // Limit the number of documents per page
      }
    ]);
    res.status(200).json({ cronsData, totalCrons });
  } catch (error) {
    res.status(500).json({ message: "Failed to get crons", error: error.message });
  }
})

/*
   # Desc: Get single cron
   # Route: PUT /api/v1/admin/get-cron/:cronId
   # Access: PRIVATE
  */
const getCron = asyncHandler(async (req, res) => {
  const { cronId } = req.params;
  try {
    let cronData = await Cron.aggregate([
      {
        $match: {
          cronId: parseInt(cronId)
        }
      },
      {
        $lookup: {
          from: 'users', // The collection name in MongoDB
          localField: 'userId',
          foreignField: 'userId',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true // This will keep crons even if there is no matching user
        }
      },
      {
        $addFields: {
          name: { $ifNull: ['$userDetails.name', 'Unknown'] } // Provide a default name if not found
        }
      }
    ]);
    
    cronData = cronData.length > 0 ? cronData[0] : null;

    if (cronData.cronStartAt) {
      cronData.cronStartAt = utcToLocal(cronData.cronStartAt, cronData.timeZone);
    }
    if (cronData.cronEndAt) {
      cronData.cronEndAt = utcToLocal(cronData.cronEndAt, cronData.timeZone);
    }
    if (cronData.timeOffStartAt) {
      cronData.timeOffStartAt = utcToLocal(cronData.timeOffStartAt, cronData.timeZone);
    }
    if (cronData.timeOffEndAt) {
      cronData.timeOffEndAt = utcToLocal(cronData.timeOffEndAt, cronData.timeZone);
    }

    if (cronData.workingWindowStartAt) {
      cronData.workingWindowStartAt = utcTimeToLocalTime(cronData.workingWindowStartAt, cronData.timeZone);
    }
    if (cronData.workingWindowEndAt) {
      cronData.workingWindowEndAt = utcTimeToLocalTime(cronData.workingWindowEndAt, cronData.timeZone);
    }

    res.status(200).json({ cronData });
  } catch (error) {
    res.status(500).json({ message: "Failed to get crons", error: error.message });
  }
});

const deleteCron = asyncHandler(async (req, res) => {
  const { cronId } = req.params;
  if (!cronId) {
    throw new BadRequestError("cronId not received in request");
  }

  try {
    // Find and delete the cron by ID
    const cron = await Cron.findByIdAndDelete(cronId);

    // If cron does not exist, send a 404 error
    if (!cron) {
      return res.status(404).json({ message: 'Cron not found' });
    }

    // Respond with success message
    res.status(200).json({ message: 'Successfully deleted the cron' });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete cron", error: error.message });
  }
});

export {
  addCron,
  updateCron,
  getAllCrons,
  getCron,
  deleteCron,
};
