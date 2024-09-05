//? ===================================================== V1 Routes =====================================================
import express from "express";
import userRoutes from "./api-v1/userRoutes.js"
import adminRoutes from "./api-v1/adminRoutes.js"
import workOrderTypesRoutes from './api-v1/workOrderTypesRoutes.js';
import integrationRoutes from './api-v1/integrationRoutes.js';
import cronRoutes from './api-v1/cronRoutes.js';
import logsRoutes from './api-v1/logsRoutes.js';
const router = express.Router();

//* ==================== V1 Routes ====================
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/logs", logsRoutes);
router.use('/work-order-type', workOrderTypesRoutes);
router.use('/integration', integrationRoutes);
router.use('/crons', cronRoutes);

export default router;