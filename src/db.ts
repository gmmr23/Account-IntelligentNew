import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'account_intelligence.db');
const database = new DatabaseSync(dbPath);

// Initialize Tables
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    password_hash TEXT,
    token TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS research_history (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    company_name TEXT NOT NULL,
    website TEXT,
    status TEXT NOT NULL,
    report_json TEXT,
    raw_html TEXT,
    processing_time INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export interface UserRecord {
  id: string;
  email: string;
  company_name: string;
  token?: string;
  created_at?: string;
}

export interface ResearchHistoryRecord {
  id: string;
  user_email?: string;
  company_name: string;
  website?: string;
  status: string;
  report_json?: string;
  raw_html?: string;
  processing_time?: number;
  created_at?: string;
}

// User helper methods
export function upsertUser(email: string, companyName: string, passwordHash?: string): UserRecord {
  const normalizedEmail = email.trim().toLowerCase();
  const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const id = 'usr_' + Math.random().toString(36).substring(2, 10);

  const existingStmt = database.prepare('SELECT * FROM users WHERE email = ?');
  const existing = existingStmt.get(normalizedEmail) as any;

  if (existing) {
    const updateStmt = database.prepare(`
      UPDATE users 
      SET company_name = ?, token = ?, updated_at = datetime('now')
      WHERE email = ?
    `);
    updateStmt.run(companyName.trim(), token, normalizedEmail);

    return {
      id: existing.id,
      email: normalizedEmail,
      company_name: companyName.trim(),
      token,
      created_at: existing.created_at
    };
  } else {
    const insertStmt = database.prepare(`
      INSERT INTO users (id, email, company_name, password_hash, token)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, normalizedEmail, companyName.trim(), passwordHash || '', token);

    return {
      id,
      email: normalizedEmail,
      company_name: companyName.trim(),
      token,
      created_at: new Date().toISOString()
    };
  }
}

export function getUserByToken(token: string): UserRecord | null {
  if (!token) return null;
  const stmt = database.prepare('SELECT * FROM users WHERE token = ?');
  const row = stmt.get(token) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    company_name: row.company_name,
    token: row.token,
    created_at: row.created_at
  };
}

export function getUserByEmail(email: string): UserRecord | null {
  if (!email) return null;
  const stmt = database.prepare('SELECT * FROM users WHERE LOWER(email) = ?');
  const row = stmt.get(email.trim().toLowerCase()) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    company_name: row.company_name,
    token: row.token,
    created_at: row.created_at
  };
}

export function getUserByCompanyName(companyName: string): UserRecord | null {
  if (!companyName) return null;
  const stmt = database.prepare('SELECT * FROM users WHERE LOWER(company_name) = ?');
  const row = stmt.get(companyName.trim().toLowerCase()) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    company_name: row.company_name,
    token: row.token,
    created_at: row.created_at
  };
}

export function getLatestUser(): UserRecord | null {
  const stmt = database.prepare('SELECT * FROM users ORDER BY updated_at DESC LIMIT 1');
  const row = stmt.get() as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    company_name: row.company_name,
    token: row.token,
    created_at: row.created_at
  };
}

// Research history helper methods
export function saveHistoryRecord(record: {
  id: string;
  user_email?: string;
  company_name: string;
  website?: string;
  status: string;
  report?: any;
  rawHtml?: string;
  processingTime?: number;
}) {
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO research_history (id, user_email, company_name, website, status, report_json, raw_html, processing_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.id,
    record.user_email || '',
    record.company_name,
    record.website || '',
    record.status,
    record.report ? JSON.stringify(record.report) : '',
    record.rawHtml || '',
    record.processingTime || 0
  );
}

export function getAllHistoryRecords(): any[] {
  const stmt = database.prepare('SELECT * FROM research_history ORDER BY created_at DESC');
  const rows = stmt.all() as any[];

  return rows.map(r => ({
    id: r.id,
    companyName: r.company_name,
    website: r.website,
    email: r.user_email,
    date: r.created_at,
    status: r.status,
    report: r.report_json ? JSON.parse(r.report_json) : undefined,
    rawHtml: r.raw_html,
    processingTime: r.processing_time
  }));
}

export default database;
