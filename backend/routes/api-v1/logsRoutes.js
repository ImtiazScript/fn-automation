//? ===================================================== Logs Routes =====================================================
import express from "express";
// Reference: https://www.npmjs.com/package/base-auth-handler
import { requireAuth } from "base-auth-handler";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
const router = express.Router();
import {
  getLogs,
  getLogById,
} from "../../controllers/logsController.js";

//* ==================== Logs Routes ====================
router.get("/get-logs", requireAuth, verifyAdmin, getLogs);
router.get("/get-log/:id", requireAuth, verifyAdmin, getLogById);

export default router;
