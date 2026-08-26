import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/:id/read', ctrl.markRead);

export default router;
