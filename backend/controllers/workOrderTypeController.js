import asyncHandler from 'express-async-handler';
import typesOfWorkOrder from '../models/typesOfWorkOrder.js';
import { NotFoundError } from '@emtiaj/custom-errors';


/*
   # Desc: Add a new work order type
   # Route: POST /api/v1/work-order-type/add
   # Access: PRIVATE
  */
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


/*
   # Desc: Get all work order types
   # Route: GET /api/v1/work-order-type/all
   # Access: PRIVATE
  */
export const getAllWorkOrderTypes = asyncHandler(async (req, res) => {
  const workOrderTypes = await typesOfWorkOrder
    .find({ disabled: false })             // Filter for non-disabled types
    .select('typeId fnTypeId fnTypeName')                // Select only the fnTypeId field
    .sort({ typeId: 1 })                  // Sort by fnTypeId in ascending order
    .lean();                                // Return plain JavaScript objects instead of Mongoose documents
  res.status(200).json(workOrderTypes);
});


/*
   # Desc: Get a single work order type detail by id
   # Route: GET /api/v1/work-order-type/:id
   # Access: PRIVATE
  */
export const getWorkOrderTypeById = asyncHandler(async (req, res) => {
  const workOrderType = await typesOfWorkOrder.findById(req.params.id);
  if (workOrderType) {
    res.status(200).json(workOrderType);
  } else {
    throw new NotFoundError("Work order type not found.");
  }
});


/*
   # Desc: Update a work order type
   # Route: PUT /api/v1/work-order-type/update/:id
   # Access: PRIVATE
  */
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


/*
   # Desc: Disable a work order type (soft delete)
   # Route: PUT /api/v1/work-order-type/disable/:id
   # Access: PRIVATE
  */
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
