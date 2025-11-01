import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { env } from './env'
import { registerAuthRoutes } from './routes/auth'
import { registerFeedingRoutes } from './routes/feedings'
import { registerMeasurementRoutes } from './routes/measurements'
import { registerReminderRoutes } from './routes/reminders'

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  })

  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? true,
    credentials: true,
  })

  app.get('/health', async () => ({ status: 'ok' }))

  await registerAuthRoutes(app)
  await registerFeedingRoutes(app)
  await registerMeasurementRoutes(app)
  await registerReminderRoutes(app)

  return app
}

async function start() {
  const app = await createServer()

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`🚀 Server ready at http://${env.HOST}:${env.PORT}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}

