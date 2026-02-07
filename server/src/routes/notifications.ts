import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { getOrderWithItems } from '../services/orderService.js';
import { sendConfirmationEmail, sendReadyEmail } from '../services/emailService.js';
import { notificationRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All notification routes require staff authentication
router.use(requireAuth);
router.use(requireStaff);

const sendNotificationSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(['confirmation', 'ready']),
});

// POST /api/notifications/send - Send notification email (rate limited, async)
router.post('/send', notificationRateLimiter, (req, res, next) => {
  try {
    const { orderId, type } = sendNotificationSchema.parse(req.body);

    const result = getOrderWithItems(orderId);
    if (!result) {
      return next(createError('Order not found', 404, 'ORDER_NOT_FOUND'));
    }

    const { order, lineItems } = result;

    // Send email async - don't block response
    const sendEmail = async () => {
      try {
        switch (type) {
          case 'confirmation':
            await sendConfirmationEmail(order, lineItems);
            break;
          case 'ready':
            await sendReadyEmail(order, lineItems);
            break;
        }
      } catch (err) {
        console.error('Async email send failed:', err instanceof Error ? err.message : 'Unknown error');
      }
    };

    // Fire and forget - email sends in background
    sendEmail();

    res.json({ success: true, message: 'Email queued for delivery' });
  } catch (err) {
    next(err);
  }
});

export default router;
