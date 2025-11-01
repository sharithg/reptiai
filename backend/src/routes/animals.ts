import type { FastifyInstance } from 'fastify'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { requireAuth } from '../auth/session'
import { animal, db } from '../db/db'

const animalResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  species: z.string().nullable(),
  description: z.string().nullable(),
  birthDate: z.string().nullable(),
  sex: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type AnimalResponse = z.infer<typeof animalResponseSchema>

const createAnimalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 character long')
    .max(100, 'Name must be 100 characters or less'),
  species: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  birthDate: z.coerce.date().optional(),
  sex: z.string().trim().max(32).optional(),
})

const updateAnimalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name must be at least 1 character long')
      .max(100, 'Name must be 100 characters or less')
      .optional(),
    species: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    birthDate: z.coerce.date().nullable().optional(),
    sex: z.string().trim().max(32).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields provided to update',
  })

const animalParamsSchema = z.object({
  id: z.string().uuid(),
})

export async function registerAnimalRoutes(app: FastifyInstance) {
  app.get('/animals', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const records = await db
      .select()
      .from(animal)
      .where(eq(animal.userId, auth.user.id))
      .orderBy(asc(animal.name))

    reply.send(records.map(toAnimalResponse))
  })

  app.post('/animals', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsed = createAnimalSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid animal payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const payload = sanitizeCreateAnimalPayload(parsed.data)

    const existing = await db
      .select({ id: animal.id })
      .from(animal)
      .where(and(eq(animal.userId, auth.user.id), eq(animal.name, payload.name)))
      .limit(1)

    if (existing.length > 0) {
      reply.code(409).send({ error: 'An animal with this name already exists' })
      return
    }

    const [record] = await db
      .insert(animal)
      .values({
        userId: auth.user.id,
        ...payload,
      })
      .returning()

    reply.code(201).send(toAnimalResponse(record))
  })

  app.patch('/animals/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = animalParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid animal identifier' })
      return
    }

    const parsedBody = updateAnimalSchema.safeParse(request.body)
    if (!parsedBody.success) {
      reply.code(400).send({
        error: 'Invalid animal update payload',
        details: parsedBody.error.flatten(),
      })
      return
    }

    const updates = sanitizeUpdateAnimalPayload(parsedBody.data)

    if (Object.keys(updates).length === 0) {
      reply.code(400).send({ error: 'No fields provided to update' })
      return
    }

    if (updates.name) {
      const duplicate = await db
        .select({ id: animal.id })
        .from(animal)
        .where(and(eq(animal.userId, auth.user.id), eq(animal.name, updates.name)))
        .limit(1)

      if (duplicate.length > 0 && duplicate[0].id !== parsedParams.data.id) {
        reply.code(409).send({ error: 'An animal with this name already exists' })
        return
      }
    }

    const [updated] = await db
      .update(animal)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(animal.id, parsedParams.data.id), eq(animal.userId, auth.user.id)))
      .returning()

    if (!updated) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    reply.send(toAnimalResponse(updated))
  })

  app.delete('/animals/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = animalParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid animal identifier' })
      return
    }

    const [deleted] = await db
      .delete(animal)
      .where(and(eq(animal.id, parsedParams.data.id), eq(animal.userId, auth.user.id)))
      .returning({ id: animal.id })

    if (!deleted) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    reply.send({ success: true })
  })
}

function toAnimalResponse(record: typeof animal.$inferSelect): AnimalResponse {
  return {
    id: record.id,
    name: record.name,
    species: record.species ?? null,
    description: record.description ?? null,
    birthDate: record.birthDate ? record.birthDate.toISOString() : null,
    sex: record.sex ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function sanitizeCreateAnimalPayload(
  input: z.infer<typeof createAnimalSchema>,
): Omit<typeof animal.$inferInsert, 'userId'> {
  return {
    name: input.name.trim(),
    species: sanitizeOptionalString(input.species),
    description: sanitizeOptionalString(input.description),
    birthDate: input.birthDate ?? null,
    sex: sanitizeOptionalString(input.sex),
  }
}

function sanitizeUpdateAnimalPayload(
  input: z.infer<typeof updateAnimalSchema>,
): Partial<Omit<typeof animal.$inferInsert, 'userId'>> {
  const payload: Partial<Omit<typeof animal.$inferInsert, 'userId'>> = {}

  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.species !== undefined) payload.species = sanitizeOptionalString(input.species)
  if (input.description !== undefined) payload.description = sanitizeOptionalString(input.description)
  if (input.birthDate !== undefined) payload.birthDate = input.birthDate ?? null
  if (input.sex !== undefined) payload.sex = sanitizeOptionalString(input.sex)

  return payload
}

function sanitizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

