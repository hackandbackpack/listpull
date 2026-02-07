import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: SqliteDatabase;

export function initializeDatabase() {
  // Ensure data directory exists
  const dbDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create SQLite connection
  sqlite = new Database(config.databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create Drizzle instance
  db = drizzle(sqlite, { schema });

  // Initialize tables
  createTables();

  console.log(`Database initialized at ${config.databasePath}`);
}

function createTables() {
  // Create deck_requests table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS deck_requests (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      notify_method TEXT CHECK (notify_method IN ('email', 'sms')),
      game TEXT NOT NULL CHECK (game IN ('magic', 'onepiece', 'pokemon', 'other')),
      format TEXT,
      pickup_window TEXT,
      notes TEXT,
      raw_decklist TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'ready', 'picked_up', 'cancelled')),
      staff_notes TEXT,
      estimated_total REAL,
      missing_items TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create deck_line_items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS deck_line_items (
      id TEXT PRIMARY KEY,
      deck_request_id TEXT NOT NULL REFERENCES deck_requests(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      card_name TEXT NOT NULL,
      parse_confidence REAL,
      line_raw TEXT NOT NULL,
      quantity_found INTEGER,
      unit_price REAL,
      condition_variants TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
      created_at TEXT NOT NULL
    )
  `);

  // Create indexes
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_deck_requests_order_number ON deck_requests(order_number);
    CREATE INDEX IF NOT EXISTS idx_deck_requests_email ON deck_requests(email);
    CREATE INDEX IF NOT EXISTS idx_deck_requests_status ON deck_requests(status);
    CREATE INDEX IF NOT EXISTS idx_deck_line_items_deck_request_id ON deck_line_items(deck_request_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function getSqlite(): SqliteDatabase {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sqlite;
}

export { schema };
