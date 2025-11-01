import type { FastifyInstance } from 'fastify'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { requireAuth } from '../auth/session'
import { db, feedingRecord } from '../db/db'

const feedingResponseSchema = z.object({
  id: z.string().uuid(),
  feedingDate: z.string(),
  consumed: z.string(),
  foodType: z.string().nullable(),
  quantity: z.string().nullable(),
  notes: z.string().nullable(),
  weight: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type FeedingResponse = z.infer<typeof feedingResponseSchema>

const feedingInputSchema = z.object({
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

function toFeedingResponse(record: typeof feedingRecord.$inferSelect): FeedingResponse {
  return {
    id: record.id,
    feedingDate: record.feedingDate.toISOString(),
    consumed: record.consumed,
    foodType: record.foodType ?? null,
    quantity: record.quantity ?? null,
    notes: record.notes ?? null,
    weight: record.weight ?? null,
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

    const {
      feedingDate,
      consumed = 'fully',
      foodType,
      quantity,
      notes,
      weight,
    } = parsed.data

    const sanitizedFoodType = foodType.trim()
    const sanitizedQuantity = quantity.trim()
    const sanitizedNotes = notes && notes.length > 0 ? notes : null

    const [record] = await db
      .insert(feedingRecord)
      .values({
        userId: auth.user.id,
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

    const records = await db
      .select()
      .from(feedingRecord)
      .where(eq(feedingRecord.userId, auth.user.id))
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

