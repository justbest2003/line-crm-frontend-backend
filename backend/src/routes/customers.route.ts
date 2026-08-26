import { Router } from 'express';
import * as ctrl from '../controllers/customers.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.get('/:id/messages', ctrl.getMessages);

router.post('/:id/tags', ctrl.addTag);
router.delete('/:id/tags/:tagId', ctrl.removeTag);

router.post('/:id/takeover', ctrl.takeover);
router.post('/:id/release', ctrl.release);
router.post('/:id/reply', ctrl.reply);

export default router;
