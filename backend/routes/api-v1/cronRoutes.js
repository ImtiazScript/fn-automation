//? ===================================================== Cron Routes =====================================================
import express from 'express';
import { requireAuth, validateRequest } from "base-auth-handler";
import {
  addCron,
  updateCron,
  getAllCrons,
  getCron,
} from "../../controllers/cronController.js";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
import verifyUser from "../../middlewares/verifyUserMiddleware.js";
import {
  addCronDataValidation,
  updateCronDataValidation,
} from "./backendDataValidationConfig.js";
const router = express.Router();

//* ==================== Crons Management Routes ====================
router.post("/add-cron", requireAuth, verifyUser, addCronDataValidation, validateRequest, addCron);
router.get("/get-cron/:cronId", requireAuth, verifyUser, getCron);
router.put("/update-cron", requireAuth, verifyUser, updateCronDataValidation, validateRequest, updateCron);
router.get("/get-crons", requireAuth, verifyUser, getAllCrons);

export default router;
