//? ===================================================== Integration Routes =====================================================
import express from 'express';
import {
  connectAccount,
  getIntegrationInfoByUserId,
  refreshConnection
} from '../../controllers/integrationController.js';
import { requireAuth } from "base-auth-handler";
import verifyActiveUser from "../../middlewares/verifyActiveUserMiddleware.js";
const router = express.Router();

//* ==================== Integration Management Routes ====================
router.post('/connect-account', requireAuth, verifyActiveUser, connectAccount);
router.post('/refresh-connection/:id', requireAuth, verifyActiveUser, refreshConnection);
router.get('/:id', requireAuth, verifyActiveUser, getIntegrationInfoByUserId);

export default router;
