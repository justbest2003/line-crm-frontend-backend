import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/summary', ctrl.summary);

export default router;
