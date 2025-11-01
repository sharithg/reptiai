import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  generateSessionToken,
  hashPassword,
  normalizeUsername,
  toPublicUser,
  verifyPassword,
  type PublicUser,
} from '../auth'
import { extractToken, getActiveSessionByToken } from '../auth/session'
import { db, session, user } from '../db/db'
import type { User } from '../db/schema'
import { env } from '../env'

const credentialsSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(32, 'Username must be at most 32 characters long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only include letters, numbers, dots, underscores, or dashes'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be at most 72 characters long'),
})

type CredentialsInput = z.infer<typeof credentialsSchema>

type SessionPayload = {
  token: string
  expiresAt: string
}

type AuthResponse = {
  user: PublicUser
  session: SessionPayload
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid credentials payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const { username, password } = parsed.data
    const normalizedUsername = normalizeUsername(username)

    const existingUser = await findUserByUsername(normalizedUsername)
    if (existingUser) {
      reply.code(409).send({ error: 'Username is already taken' })
      return
    }

    const passwordHash = await hashPassword(password)

    const [createdUser] = await db
      .insert(user)
      .values({
        username: normalizedUsername,
        passwordHash,
      })
      .returning()

    const sessionPayload = await createSession(createdUser.id)

    const response: AuthResponse = {
      user: toPublicUser(createdUser),
      session: sessionPayload,
    }

    reply.code(201).send(response)
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid credentials payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const { username, password } = parsed.data
    const normalizedUsername = normalizeUsername(username)

    const existingUser = await findUserByUsername(normalizedUsername)

    if (!existingUser) {
      reply.code(401).send({ error: 'Invalid username or password' })
      return
    }

    if (!existingUser.isActive) {
      reply.code(403).send({ error: 'Account is inactive. Contact an administrator.' })
      return
    }

    const passwordMatches = await verifyPassword(password, existingUser.passwordHash)

    if (!passwordMatches) {
      reply.code(401).send({ error: 'Invalid username or password' })
      return
    }

    const sessionPayload = await createSession(existingUser.id)

    const response: AuthResponse = {
      user: toPublicUser(existingUser),
      session: sessionPayload,
    }

    reply.send(response)
  })

  app.get('/auth/me', async (request, reply) => {
    const token = extractToken(request.headers.authorization)

    if (!token) {
      reply.code(401).send({ error: 'Missing authorization token' })
      return
    }

    const sessionData = await getActiveSessionByToken(token)

    if (!sessionData) {
      reply.code(401).send({ error: 'Session not found or expired' })
      return
    }

    const response: AuthResponse = {
      user: toPublicUser(sessionData.user),
      session: {
        token: sessionData.session.id,
        expiresAt: sessionData.session.expiresAt.toISOString(),
      },
    }

    reply.send(response)
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = extractToken(request.headers.authorization)

    if (token) {
      await db.delete(session).where(eq(session.id, token))
    }

    reply.send({ success: true })
  })
}

async function findUserByUsername(username: string): Promise<User | null> {
  const [existingUser] = await db.select().from(user).where(eq(user.username, username)).limit(1)
  return existingUser ?? null
}

async function createSession(userId: string): Promise<SessionPayload> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000)

  const [newSession] = await db
    .insert(session)
    .values({
      id: token,
      userId,
      expiresAt,
    })
    .returning({
      id: session.id,
      expiresAt: session.expiresAt,
    })

  return {
    token: newSession.id,
    expiresAt: newSession.expiresAt.toISOString(),
  }
}

