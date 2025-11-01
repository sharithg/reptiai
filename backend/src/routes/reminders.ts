import type { FastifyInstance } from 'fastify'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { requireAuth } from '../auth/session'
import { animal, db, reminder } from '../db/db'

const reminderResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable(),
  isReminder: z.boolean(),
  dueDate: z.string().nullable(),
  isCompleted: z.boolean(),
  notificationId: z.string().nullable(),
  animalId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type ReminderResponse = z.infer<typeof reminderResponseSchema>

const createReminderSchema = z.object({
  animalId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, 'Title must be at least 1 character long')
    .max(255, 'Title must be 255 characters or less'),
  notes: z.string().trim().max(2000).optional(),
  isReminder: z.boolean().optional(),
  dueDate: z.coerce.date().optional(),
  notificationId: z.string().trim().max(255).optional(),
})

const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().max(2000).optional(),
  isReminder: z.boolean().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  isCompleted: z.boolean().optional(),
  notificationId: z.string().trim().max(255).nullable().optional(),
  animalId: z.string().uuid().optional(),
})

const reminderParamsSchema = z.object({
  id: z.string().uuid(),
})

const reminderQuerySchema = z.object({
  animalId: z.string().uuid(),
})

function toReminderResponse(record: typeof reminder.$inferSelect): ReminderResponse {
  return {
    id: record.id,
    title: record.title,
    notes: record.notes ?? null,
    isReminder: record.isReminder,
    dueDate: record.dueDate ? record.dueDate.toISOString() : null,
    isCompleted: record.isCompleted,
    notificationId: record.notificationId ?? null,
    animalId: record.animalId ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function registerReminderRoutes(app: FastifyInstance) {
  app.post('/reminders', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsed = createReminderSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400).send({
        error: 'Invalid reminder payload',
        details: parsed.error.flatten(),
      })
      return
    }

    const { animalId, title, notes, isReminder = false, dueDate, notificationId } = parsed.data

    const ownedAnimal = await ensureAnimalOwnership(auth.user.id, animalId)
    if (!ownedAnimal) {
      reply.code(404).send({ error: 'Animal not found' })
      return
    }

    const sanitizedNotes = notes && notes.length > 0 ? notes : null
    const sanitizedNotificationId =
      notificationId && notificationId.length > 0 ? notificationId : null

    const [record] = await db
      .insert(reminder)
      .values({
        userId: auth.user.id,
        animalId,
        title,
        notes: sanitizedNotes,
        isReminder,
        dueDate: dueDate ?? null,
        notificationId: sanitizedNotificationId,
      })
      .returning()

    reply.code(201).send(toReminderResponse(record))
  })

  app.get('/reminders', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedQuery = reminderQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      reply.code(400).send({ error: 'Invalid reminders query parameters' })
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
      .from(reminder)
      .where(and(eq(reminder.userId, auth.user.id), eq(reminder.animalId, animalId)))
      .orderBy(desc(reminder.dueDate), desc(reminder.createdAt))

    reply.send(records.map(toReminderResponse))
  })

  app.patch('/reminders/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = reminderParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid reminder identifier' })
      return
    }

    const parsedBody = updateReminderSchema.safeParse(request.body)
    if (!parsedBody.success) {
      reply.code(400).send({
        error: 'Invalid reminder update payload',
        details: parsedBody.error.flatten(),
      })
      return
    }

    const updates = parsedBody.data

    if (Object.keys(updates).length === 0) {
      reply.code(400).send({ error: 'No fields provided to update' })
      return
    }

    const updatePayload: Partial<typeof reminder.$inferSelect> & {
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (updates.title !== undefined) updatePayload.title = updates.title
    if (updates.notes !== undefined)
      updatePayload.notes = updates.notes && updates.notes.length > 0 ? updates.notes : null
    if (updates.isReminder !== undefined) updatePayload.isReminder = updates.isReminder
    if (updates.dueDate !== undefined) updatePayload.dueDate = updates.dueDate ?? null
    if (updates.isCompleted !== undefined) updatePayload.isCompleted = updates.isCompleted
    if (updates.notificationId !== undefined)
      updatePayload.notificationId = updates.notificationId && updates.notificationId.length > 0
        ? updates.notificationId
        : null
    if (updates.animalId !== undefined) {
      const ownedAnimal = await ensureAnimalOwnership(auth.user.id, updates.animalId)
      if (!ownedAnimal) {
        reply.code(404).send({ error: 'Animal not found' })
        return
      }
      updatePayload.animalId = updates.animalId
    }

    const [updated] = await db
      .update(reminder)
      .set(updatePayload)
      .where(and(eq(reminder.id, parsedParams.data.id), eq(reminder.userId, auth.user.id)))
      .returning()

    if (!updated) {
      reply.code(404).send({ error: 'Reminder not found' })
      return
    }

    reply.send(toReminderResponse(updated))
  })

  app.delete('/reminders/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply)
    if (!auth) return

    const parsedParams = reminderParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      reply.code(400).send({ error: 'Invalid reminder identifier' })
      return
    }

    const { id } = parsedParams.data

    const [deleted] = await db
      .delete(reminder)
      .where(and(eq(reminder.id, id), eq(reminder.userId, auth.user.id)))
      .returning({ id: reminder.id })

    if (!deleted) {
      reply.code(404).send({ error: 'Reminder not found' })
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

