import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../auth/session'
import { animal, db, measurementLog } from '../db/db'

const MEASUREMENT_LIMIT = 200

const measurementResponseSchema = z.object({
  id: z.string().uuid(),
  metricType: z.string(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  notes: z.string().nullable(),
  recordedAt: z.string(),
  animalId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type MeasurementResponse = z.infer<typeof measurementResponseSchema>

const measurementInputSchema = z
  .object({
    animalId: z.string().uuid(),
    metricType: z
      .string()
      .trim()
      .min(1, 'Metric type is required')
      .max(64, 'Metric type must be at most 64 characters'),
    value: z.number().finite().optional(),
    unit: z.string().trim().max(32).optional(),
    notes: z.string().trim().max(1000).optional(),
    recordedAt: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.metricType.toLowerCase() !== 'note' && data.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value is required for this measurement type',
        path: ['value'],
      })
    }
  })

const measurementParamsSchema = z.object({
  id: z.string().uuid(),
})

const measurementQuerySchema = z.object({
  animalId: z.string().uuid(),
})

function toMeasurementResponse(record: typeof measurementLog.$inferSelect): MeasurementResponse {
  return {
    id: record.id,
    metricType: record.metricType,
    value: record.value ?? null,
    unit: record.unit ?? null,
    notes: record.notes ?? null,
    recordedAt: record.recordedAt.toISOString(),
    animalId: record.animalId ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function registerMeasurementRoutes(app: FastifyInstance) {
  app.post('/measurements', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsed = measurementInputSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid measurement payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const { animalId, metricType, value, unit, notes, recordedAt } = parsed.data

    const ownedAnimal = await ensureAnimalOwnership(auth.user.id, animalId)
    if (!ownedAnimal) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    const [record] = await db
      .insert(measurementLog)
      .values({
        userId: auth.user.id,
        animalId,
        metricType,
        value: value ?? null,
        unit: unit && unit.length > 0 ? unit : null,
        notes: notes && notes.length > 0 ? notes : null,
        recordedAt: recordedAt ?? new Date(),
      })
      .returning()

    reply.code(201).send(toMeasurementResponse(record))
  })

  app.get('/measurements', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedQuery = measurementQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      reply.code(400).send({ error: 'Invalid measurements query parameters' })
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
      .from(measurementLog)
      .where(and(eq(measurementLog.userId, auth.user.id), eq(measurementLog.animalId, animalId)))
      .orderBy(desc(measurementLog.recordedAt), desc(measurementLog.createdAt))
      .limit(MEASUREMENT_LIMIT)

    reply.send(records.map(toMeasurementResponse))
  })

  app.delete('/measurements/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = measurementParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid measurement identifier' })
      return
    }

    const { id } = parsedParams.data

    const [deleted] = await db
      .delete(measurementLog)
      .where(and(eq(measurementLog.id, id), eq(measurementLog.userId, auth.user.id)))
      .returning({ id: measurementLog.id })

    if (!deleted) {
      reply.code(404).send({ error: 'Measurement not found' })
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

