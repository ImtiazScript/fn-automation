import express from 'express';
import { requireAuth, validateRequest } from "base-auth-handler";

import {
    updateCron,
    getAllCrons,
    getCron,
  } from "../../controllers/adminController.js";
  
  // Data validation configuration
  import {
    updateCronDataValidation,
  } from "./backendDataValidationConfig.js";


const router = express.Router();

router.put("/update-cron", requireAuth, updateCronDataValidation, validateRequest, updateCron);

router.get("/get-crons", requireAuth, getAllCrons);

router.get("/get-cron/:cronId", requireAuth, getCron);

export default router;
