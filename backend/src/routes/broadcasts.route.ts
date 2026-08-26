import { Router } from 'express';
import * as ctrl from '../controllers/broadcasts.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

export default router;
