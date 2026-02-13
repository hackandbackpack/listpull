import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { getOrderWithItems } from '../services/orderService.js';
import { enqueueEmail } from '../services/emailQueueService.js';
import { notificationRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All notification routes require staff authentication
router.use(requireAuth);
router.use(requireStaff);

const sendNotificationSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(['confirmation', 'ready']),
});

// POST /api/notifications/send - Queue notification email (rate limited)
router.post('/send', notificationRateLimiter, (req, res, next) => {
  try {
    const { orderId, type } = sendNotificationSchema.parse(req.body);

    const result = getOrderWithItems(orderId);
    if (!result) {
      return next(createError('Order not found', 404, 'ORDER_NOT_FOUND'));
    }

    const { order } = result;

    enqueueEmail(order.id, order.email, type);

    res.json({ success: true, message: 'Notification queued' });
  } catch (err) {
    next(err);
  }
});

export default router;
