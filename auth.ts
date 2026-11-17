import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data/loraku.db');
const SECRET_FILE = path.resolve(path.dirname(DB_PATH), '.jwt_secret');

function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const JWT_SECRET = resolveJwtSecret();
export const ADMIN_COOKIE_NAME = 'loraku_admin_session';

export interface AdminTokenPayload {
  adminId: number;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: number;
    username: string;
    display_name: string;
  };
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

function isHttpsRequest(req?: Request): boolean {
  if (!req) return process.env.NODE_ENV === 'production';
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

export function setAdminCookie(res: Response, token: string, req?: Request): void {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAdminCookie(res: Response, req?: Request): void {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    path: '/',
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[ADMIN_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    const admin = db
      .prepare('SELECT id, username, display_name FROM admins WHERE id = ?')
      .get(decoded.adminId) as { id: number; username: string; display_name: string } | undefined;
    if (!admin) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid' });
  }
}
