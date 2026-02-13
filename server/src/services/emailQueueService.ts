import { getDatabase } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendConfirmationEmail, sendReadyEmail } from './emailService.js';
import { getOrderWithItems } from './orderService.js';

const MAX_ATTEMPTS = 3;

export function enqueueEmail(orderId: string, recipient: string, template: 'confirmation' | 'ready') {
  const db = getDatabase();
  db.insert(schema.emailQueue).values({ orderId, recipient, template }).run();
}

export function processEmailQueue() {
  const db = getDatabase();
  const pending = db.select().from(schema.emailQueue)
    .where(eq(schema.emailQueue.status, 'pending'))
    .all();

  for (const entry of pending) {
    processEmail(entry);
  }
}

async function processEmail(entry: typeof schema.emailQueue.$inferSelect) {
  const db = getDatabase();
  try {
    const result = getOrderWithItems(String(entry.orderId));
    if (!result) throw new Error(`Order ${entry.orderId} not found`);

    const { order, lineItems } = result;

    if (entry.template === 'confirmation') {
      await sendConfirmationEmail(order, lineItems);
    } else if (entry.template === 'ready') {
      await sendReadyEmail(order, lineItems);
    }

    db.update(schema.emailQueue)
      .set({ status: 'sent', sentAt: new Date().toISOString() })
      .where(eq(schema.emailQueue.id, entry.id))
      .run();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = entry.attempts + 1;
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
    db.update(schema.emailQueue)
      .set({ attempts, lastError: message, status })
      .where(eq(schema.emailQueue.id, entry.id))
      .run();
  }
}

export function startEmailProcessor() {
  setInterval(processEmailQueue, 30_000); // Every 30 seconds
}
