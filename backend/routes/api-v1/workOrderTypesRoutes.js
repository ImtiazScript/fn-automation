import express from 'express';
import {
  addWorkOrderType,
  getAllWorkOrderTypes,
  getWorkOrderTypeById,
  updateWorkOrderType,
  disableWorkOrderType,
} from '../../controllers/workOrderTypeController.js';


const router = express.Router();

router.post('/add', addWorkOrderType);
router.get('/all', getAllWorkOrderTypes);
router.get('/:id', getWorkOrderTypeById);
router.put('/update/:id', updateWorkOrderType);
router.put('/disable/:id', disableWorkOrderType);

export default router;
