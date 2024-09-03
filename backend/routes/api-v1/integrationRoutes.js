import express from 'express';
import {
  connectAccount,
  getIntegrationInfoByUserId,
  refreshConnection
} from '../../controllers/integrationController.js';


const router = express.Router();

router.post('/connect-account', connectAccount);
router.post('/refresh-connection/:id', refreshConnection);
router.get('/:id', getIntegrationInfoByUserId);

export default router;
