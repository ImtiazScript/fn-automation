//? ===================================================== Work Order Type Routes =====================================================
import express from 'express';
import {
  addWorkOrderType,
  getAllWorkOrderTypes,
  getWorkOrderTypeById,
  updateWorkOrderType,
  disableWorkOrderType,
} from '../../controllers/workOrderTypeController.js';
import { requireAuth } from "base-auth-handler";
import verifyUser from "../../middlewares/verifyUserMiddleware.js";
import verifyAdmin from "../../middlewares/verifyAdminMiddleware.js";
const router = express.Router();

//* ==================== Work Order Type Management Routes ====================
router.post('/add', requireAuth, verifyAdmin, addWorkOrderType);
router.get('/all', requireAuth, verifyUser, getAllWorkOrderTypes);
router.get('/:id', requireAuth, verifyUser, getWorkOrderTypeById);
router.put('/update/:id', requireAuth, verifyAdmin, updateWorkOrderType);
router.put('/disable/:id', requireAuth, verifyAdmin, disableWorkOrderType);

export default router;
