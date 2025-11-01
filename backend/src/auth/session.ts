import type { FastifyReply, FastifyRequest } from 'fastify'
import { and, eq } from 'drizzle-orm'

import { db, session, user } from '../db/db'
import type { Session, User } from '../db/schema'

export type AuthenticatedContext = {
  session: Session
  user: User
}

export function extractToken(header?: string): string | null {
  if (!header) return null
  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null
  return value.trim()
}

export async function getActiveSessionByToken(token: string): Promise<AuthenticatedContext | null> {
  const [record] = await db
    .select({
      sessionId: session.id,
      sessionUserId: session.userId,
      sessionExpiresAt: session.expiresAt,
      sessionCreatedAt: session.createdAt,
      userId: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.id, token))
    .limit(1)

  if (!record) {
    return null
  }

  if (record.sessionExpiresAt.getTime() <= Date.now() || !record.isActive) {
    await db.delete(session).where(eq(session.id, token))
    return null
  }

  const sessionRecord: Session = {
    id: record.sessionId,
    userId: record.sessionUserId,
    expiresAt: record.sessionExpiresAt,
    createdAt: record.sessionCreatedAt,
  }

  const userRecord: User = {
    id: record.userId,
    username: record.username,
    passwordHash: record.passwordHash,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }

  return {
    session: sessionRecord,
    user: userRecord,
  }
}

export async function authenticateRequest(request: FastifyRequest): Promise<AuthenticatedContext | null> {
  const token = extractToken(request.headers.authorization)
  if (!token) return null
  return getActiveSessionByToken(token)
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedContext | null> {
  const context = await authenticateRequest(request)
  if (!context) {
    reply.code(401).send({ error: 'Unauthorized' })
    return null
  }
  return context
}

export async function ensureOwnership<T extends { userId: string }>(
  resource: T,
  auth: AuthenticatedContext,
): Promise<boolean> {
  return resource.userId === auth.user.id
}

export async function deleteUserSession(token: string, userId: string): Promise<void> {
  await db.delete(session).where(and(eq(session.id, token), eq(session.userId, userId)))
}

