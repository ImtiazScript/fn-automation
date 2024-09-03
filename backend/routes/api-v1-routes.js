//? ===================================================== V1 Routes =====================================================

// ===================== Importing necessary modules/files =====================
import express from "express";

import userRoutes from "./api-v1/userRoutes.js"
import adminRoutes from "./api-v1/adminRoutes.js"
import workOrderTypesRoutes from './api-v1/workOrderTypesRoutes.js';
import integrationRoutes from './api-v1/integrationRoutes.js';

// ===================== Configuring Express Router =====================
const router = express.Router();

//* ==================== V1 Routes ====================

router.use("/user", userRoutes);

router.use("/admin", adminRoutes);

router.use('/work-order-type', workOrderTypesRoutes);

router.use('/integration', integrationRoutes);

export default router;