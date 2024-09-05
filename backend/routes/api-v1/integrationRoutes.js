//? ===================================================== Integration Routes =====================================================
import express from 'express';
import {
  connectAccount,
  getIntegrationInfoByUserId,
  refreshConnection
} from '../../controllers/integrationController.js';
import { requireAuth } from "base-auth-handler";
import verifyUser from "../../middlewares/verifyUserMiddleware.js";
const router = express.Router();

//* ==================== Integration Management Routes ====================
router.post('/connect-account', requireAuth, verifyUser, connectAccount);
router.post('/refresh-connection/:id', requireAuth, verifyUser, refreshConnection);
router.get('/:id', requireAuth, verifyUser, getIntegrationInfoByUserId);

export default router;
