import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { initializeDatabase, getDatabase } from './index.js';
import { users } from './schema.js';

const BCRYPT_ROUNDS = 13; // Slightly higher for admin accounts

async function seed() {
  console.log('Initializing database...');
  initializeDatabase();

  const db = getDatabase();

  // Check if admin user already exists
  const existingAdmin = db.select().from(users).where(eq(users.email, 'admin@store.com')).get();

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  // Require password from environment variable in production
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is required.');
    console.error('Set it before running seed: ADMIN_PASSWORD=your-secure-password npm run seed');
    process.exit(1);
  }

  if (adminPassword.length < 12) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  db.insert(users).values({
    id: uuidv4(),
    email: 'admin@store.com',
    passwordHash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  }).run();

  console.log('Created admin user:');
  console.log('  Email: admin@store.com');
  console.log('  Password: [set via ADMIN_PASSWORD env var]');
}

seed().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : 'Unknown error');
  process.exit(1);
});
