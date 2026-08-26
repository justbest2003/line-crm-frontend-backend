import { Router, raw } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

// LINE sends JSON but we need the raw body for signature verification
router.use(raw({ type: 'application/json' }));

router.post('/line', webhookController.handleWebhook);

export default router;
