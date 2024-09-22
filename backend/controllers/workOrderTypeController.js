import asyncHandler from 'express-async-handler';
import typesOfWorkOrder from '../models/typesOfWorkOrder.js';
import { BadRequestError, UnauthorizedError, NotFoundError, InternalServerError } from '@emtiaj/custom-errors';

// @desc    Add a new work order type
// @route   POST /api/v1/work-order-type/add
// @access  Private
export const addWorkOrderType = asyncHandler(async (req, res) => {
  const { fnTypeId, fnTypeName, level, parentIds, childrenIds, legacyTypeOfWork, serviceTypes } = req.body;
  const newWorkOrderType = new typesOfWorkOrder({
    fnTypeId,
    fnTypeName,
    level,
    parentIds,
    childrenIds,
    legacyTypeOfWork,
    serviceTypes,
  });
  const createdWorkOrderType = await newWorkOrderType.save();
  res.status(201).json(createdWorkOrderType);
});


// @desc    Get all work order types
// @route   GET /api/v1/work-order-type/all
// @access  Private
export const getAllWorkOrderTypes = asyncHandler(async (req, res) => {
  const workOrderTypes = await typesOfWorkOrder
    .find({ disabled: false })             // Filter for non-disabled types
    .select('typeId fnTypeId fnTypeName')                // Select only the fnTypeId field
    .sort({ typeId: 1 })                  // Sort by fnTypeId in ascending order
    .lean();                                // Return plain JavaScript objects instead of Mongoose documents
  res.status(200).json(workOrderTypes);
});


// @desc    Get a single work order type by ID
// @route   GET /api/v1/work-order-type/:id
// @access  Private
export const getWorkOrderTypeById = asyncHandler(async (req, res) => {
  const workOrderType = await typesOfWorkOrder.findById(req.params.id);
  if (workOrderType) {
    res.status(200).json(workOrderType);
  } else {
    throw new NotFoundError("Work order type not found.");
  }
});


// @desc    Update a work order type
// @route   PUT /api/v1/work-order-type/update/:id
// @access  Private
export const updateWorkOrderType = asyncHandler(async (req, res) => {
  const { fnTypeId, fnTypeName } = req.body;
  const workOrderType = await typesOfWorkOrder.findById(req.params.id);
  if (workOrderType) {
    workOrderType.fnTypeId = fnTypeId || workOrderType.fnTypeId;
    workOrderType.fnTypeName = fnTypeName || workOrderType.fnTypeName;
    const updatedWorkOrderType = await workOrderType.save();
    res.status(200).json(updatedWorkOrderType);
  } else {
    throw new NotFoundError("Work order type not found.");
  }
});


// @desc    Disable a work order type (soft delete)
// @route   PUT /api/v1/work-order-type/disable/:id
// @access  Private
export const disableWorkOrderType = asyncHandler(async (req, res) => {
  const workOrderType = await typesOfWorkOrder.findById(req.params.id);
  if (workOrderType) {
    workOrderType.disabled = true;
    await workOrderType.save();
    res.status(200).json({ message: 'Work order type disabled' });
  } else {
    throw new NotFoundError("Work order type not found.");
  }
});
