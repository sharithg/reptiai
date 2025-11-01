import type { FastifyInstance } from 'fastify'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { requireAuth } from '../auth/session'
import { animal, db, feedingRecord } from '../db/db'

const feedingResponseSchema = z.object({
  id: z.string().uuid(),
  feedingDate: z.string(),
  consumed: z.string(),
  foodType: z.string().nullable(),
  quantity: z.string().nullable(),
  notes: z.string().nullable(),
  weight: z.number().nullable(),
  animalId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type FeedingResponse = z.infer<typeof feedingResponseSchema>

const feedingInputSchema = z.object({
  animalId: z.string().uuid(),
  feedingDate: z.coerce.date().optional(),
  consumed: z.enum(['fully', 'partially', 'refused']).optional(),
  foodType: z
    .string()
    .trim()
    .min(1, 'Food type is required')
    .max(255, 'Food type must be 255 characters or less'),
  quantity: z
    .string()
    .trim()
    .min(1, 'Quantity is required')
    .max(255, 'Quantity must be 255 characters or less'),
  notes: z.string().trim().max(1000).optional(),
  weight: z.number().positive().optional(),
})

const deleteParamsSchema = z.object({
  id: z.string().uuid(),
})

const feedingQuerySchema = z.object({
  animalId: z.string().uuid(),
})

function toFeedingResponse(record: typeof feedingRecord.$inferSelect): FeedingResponse {
  return {
    id: record.id,
    feedingDate: record.feedingDate.toISOString(),
    consumed: record.consumed,
    foodType: record.foodType ?? null,
    quantity: record.quantity ?? null,
    notes: record.notes ?? null,
    weight: record.weight ?? null,
    animalId: record.animalId ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function registerFeedingRoutes(app: FastifyInstance) {
  app.post('/feedings', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsed = feedingInputSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid feeding payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const { animalId, feedingDate, consumed = 'fully', foodType, quantity, notes, weight } = parsed.data

    const ownedAnimal = await ensureAnimalOwnership(auth.user.id, animalId)
    if (!ownedAnimal) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    const sanitizedFoodType = foodType.trim()
    const sanitizedQuantity = quantity.trim()
    const sanitizedNotes = notes && notes.length > 0 ? notes : null

    const [record] = await db
      .insert(feedingRecord)
      .values({
        userId: auth.user.id,
        animalId,
        feedingDate: feedingDate ?? new Date(),
        consumed,
        foodType: sanitizedFoodType,
        quantity: sanitizedQuantity,
        notes: sanitizedNotes,
        weight: weight ?? null,
      })
      .returning()

    reply.code(201).send(toFeedingResponse(record))
  })

  app.get('/feedings', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedQuery = feedingQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      reply.code(400).send({ error: 'Invalid feedings query parameters' })
      return
    }

    const { animalId } = parsedQuery.data

    const ownedAnimal = await ensureAnimalOwnership(auth.user.id, animalId)
    if (!ownedAnimal) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    const records = await db
      .select()
      .from(feedingRecord)
      .where(and(eq(feedingRecord.userId, auth.user.id), eq(feedingRecord.animalId, animalId)))
      .orderBy(desc(feedingRecord.feedingDate), desc(feedingRecord.createdAt))
      .limit(200)

    reply.send(records.map(toFeedingResponse))
  })

  app.delete('/feedings/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = deleteParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid feeding identifier' })
      return
    }

    const { id } = parsedParams.data

    const [deleted] = await db
      .delete(feedingRecord)
      .where(and(eq(feedingRecord.id, id), eq(feedingRecord.userId, auth.user.id)))
      .returning({ id: feedingRecord.id })

    if (!deleted) {
      reply.code(404).send({ error: 'Feeding record not found' })
      return
    }

    reply.send({ success: true })
  })
}

async function ensureAnimalOwnership(userId: string, animalId: string) {
  const [record] = await db
    .select({ id: animal.id })
    .from(animal)
    .where(and(eq(animal.id, animalId), eq(animal.userId, userId)))
    .limit(1)

  return record ?? null
}

