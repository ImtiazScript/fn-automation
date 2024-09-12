//? ===================================================== Cron Routes =====================================================
import express from 'express';
import { requireAuth, validateRequest } from "base-auth-handler";
import {
  addCron,
  updateCron,
  getAllCrons,
  getCron,
  deleteCron,
} from "../../controllers/cronController.js";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
import verifyUser from "../../middlewares/verifyUserMiddleware.js";
import verifyActiveUser from "../../middlewares/verifyActiveUserMiddleware.js";
import {
  addCronDataValidation,
  updateCronDataValidation,
} from "./backendDataValidationConfig.js";
const router = express.Router();

//* ==================== Crons Management Routes ====================
router.post("/add-cron", requireAuth, verifyActiveUser, addCronDataValidation, validateRequest, addCron);
router.get("/get-cron/:cronId", requireAuth, verifyActiveUser, getCron);
router.put("/update-cron", requireAuth, verifyActiveUser, updateCronDataValidation, validateRequest, updateCron);
router.get("/get-crons/page/:page", requireAuth, verifyActiveUser, getAllCrons);
router.delete("/delete-cron/:cronId", requireAuth, verifyActiveUser, validateRequest, deleteCron);

export default router;
