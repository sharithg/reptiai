import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  interval,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Authentication tables
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // 'admin' or 'user'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Devices that publish data (Pi, Mega, etc.)
export const device = pgTable('device', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  kind: text('kind').notNull(), // ex: 'raspberry_pi','arduino','ip_cam','other'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Where a sensor lives inside the enclosure
export const zone = pgTable('zone', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g. 'basking_surface','warm_air','cool_air','ambient_mid','room'
})

// What we measure (kept normalized so you can reuse)
export const metric = pgTable('metric', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // e.g. 'temp_c','humidity_pct','lux','uvi','grams'
  unit: text('unit').notNull(), // SI symbol or descriptive (°C -> 'C', % -> 'pct')
  description: text('description'),
})

// Physical/logical sensors
export const sensor = pgTable('sensor', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  zoneId: integer('zone_id').references(() => zone.id),
  kind: text('kind').notNull(), // 'ds18b20','sht31','max31855','bh1750','hx711','custom'
  interface: text('interface').notNull(), // '1wire','i2c','spi','analog','virtual'
  address: text('address'), // 1-Wire address, I2C addr, SPI CS pin, etc.
  label: text('label'), // human name: 'Warm Air 1'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueDeviceAddress: uniqueIndex('sensor_device_address_unique').on(table.deviceId, table.address),
}))

// High-volume table for raw samples
export const reading = pgTable('reading', {
  sensorId: uuid('sensor_id').notNull().references(() => sensor.id, { onDelete: 'cascade' }),
  metricId: integer('metric_id').notNull().references(() => metric.id, { onDelete: 'restrict' }),
  ts: timestamp('ts').notNull(),
  value: doublePrecision('value').notNull(),
  meta: jsonb('meta').notNull().default('{}'), // e.g. {"quality":"ok","vbat":4.98}
}, (table) => ({
  pk: primaryKey({ columns: [table.sensorId, table.metricId, table.ts] }),
  // Helpful indexes for common queries
  tsDescIdx: index('reading_ts_desc_idx').on(table.ts.desc()),
  metricTsIdx: index('reading_metric_ts_idx').on(table.metricId, table.ts.desc()),
  sensorTsIdx: index('reading_sensor_ts_idx').on(table.sensorId, table.ts.desc()),
}))

export const calibration = pgTable('calibration', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sensorId: uuid('sensor_id').notNull().references(() => sensor.id, { onDelete: 'cascade' }),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  method: text('method').notNull(), // 'offset','slope_intercept','two_point','lookup'
  params: jsonb('params').notNull(), // e.g. {"offset": -0.3} or {"m":1.01,"b":-0.2}
  note: text('note'),
})

// What conditions should raise alerts (simple threshold model)
export const alertRule = pgTable('alert_rule', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull().unique(),
  metricId: integer('metric_id').notNull().references(() => metric.id),
  zoneId: integer('zone_id').references(() => zone.id), // optional scope
  operator: text('operator').notNull(), // '<','<=','>','>=','between','outside'
  thresholdLo: doublePrecision('threshold_lo'),
  thresholdHi: doublePrecision('threshold_hi'),
  window: interval('window').notNull().default('10 minutes'), // eval horizon
  severity: text('severity').notNull(), // ex: 'info','warning','critical'
  enabled: boolean('enabled').notNull().default(true),
}, (table) => ({
  operatorCheck: check('operator_check', 
    sql`operator IN ('<', '<=', '>', '>=', 'between', 'outside')`
  ),
}))

// Instances of alerts fired
export const alert = pgTable('alert', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ruleId: bigint('rule_id', { mode: 'number' }).notNull().references(() => alertRule.id, { onDelete: 'cascade' }),
  sensorId: uuid('sensor_id').references(() => sensor.id),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  message: text('message').notNull(),
  sample: jsonb('sample').notNull().default('{}'), // snapshot at open
  acknowledged: boolean('acknowledged').notNull().default(false),
}, (table) => ({
  openIdx: index('alert_open_idx').on(table.closedAt.nullsFirst(), table.openedAt.desc()),
}))

// Motion or notable events from video analysis
export const cameraEvent = pgTable('camera_event', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deviceId: uuid('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }), // the Pi/cam device
  ts: timestamp('ts').notNull().defaultNow(),
  kind: text('kind').notNull(), // ex: 'motion','feeding','basking','custom'
  score: doublePrecision('score'), // motion score or confidence
  meta: jsonb('meta').notNull().default('{}'), // bbox, duration, etc.
})

// Optional snapshot/clip metadata; store binaries on disk or object storage
export const mediaAsset = pgTable('media_asset', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  ts: timestamp('ts').notNull().defaultNow(),
  path: text('path').notNull(), // e.g. 'file:///…' or 's3://bucket/key'
  kind: text('kind').notNull(), // ex: 'image','clip'
  meta: jsonb('meta').notNull().default('{}'), // width/height/duration/codec
}, (table) => ({
  tsIdx: index('media_ts_idx').on(table.ts.desc()),
}))

// Environmental targets for different metrics and zones
export const environmentalTarget = pgTable('environmental_target', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  metricId: integer('metric_id').notNull().references(() => metric.id, { onDelete: 'cascade' }),
  zoneId: integer('zone_id').references(() => zone.id), // optional - null means applies to all zones
  species: text('species').notNull().default('northern_blue_tongued_skink'), // for future multi-species support
  minValue: doublePrecision('min_value').notNull(),
  maxValue: doublePrecision('max_value').notNull(),
  optimalMin: doublePrecision('optimal_min'), // optional tighter range
  optimalMax: doublePrecision('optimal_max'), // optional tighter range
  description: text('description'), // e.g. "Basking zone temperature range"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure only one active target per metric/zone/species combination
  uniqueMetricZoneSpecies: uniqueIndex('env_target_metric_zone_species_unique')
    .on(table.metricId, table.zoneId, table.species)
    .where(sql`is_active = true`),
}))

// Type exports for TypeScript
export type User = InferSelectModel<typeof user>
export type NewUser = InferInsertModel<typeof user>

export type Session = InferSelectModel<typeof session>
export type NewSession = InferInsertModel<typeof session>

export type Device = InferSelectModel<typeof device>
export type NewDevice = InferInsertModel<typeof device>

export type Zone = InferSelectModel<typeof zone>
export type NewZone = InferInsertModel<typeof zone>

export type Metric = InferSelectModel<typeof metric>
export type NewMetric = InferInsertModel<typeof metric>

export type Sensor = InferSelectModel<typeof sensor>
export type NewSensor = InferInsertModel<typeof sensor>

export type Reading = InferSelectModel<typeof reading>
export type NewReading = InferInsertModel<typeof reading>

export type Calibration = InferSelectModel<typeof calibration>
export type NewCalibration = InferInsertModel<typeof calibration>

export type AlertRule = InferSelectModel<typeof alertRule>
export type NewAlertRule = InferInsertModel<typeof alertRule>

export type Alert = InferSelectModel<typeof alert>
export type NewAlert = InferInsertModel<typeof alert>

export type CameraEvent = InferSelectModel<typeof cameraEvent>
export type NewCameraEvent = InferInsertModel<typeof cameraEvent>

export type MediaAsset = InferSelectModel<typeof mediaAsset>
export type NewMediaAsset = InferInsertModel<typeof mediaAsset>

export type EnvironmentalTarget = InferSelectModel<typeof environmentalTarget>
export type NewEnvironmentalTarget = InferInsertModel<typeof environmentalTarget>

// Feeding system tables
export const feedingTag = pgTable('feeding_tag', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull().unique(),
  category: text('category').notNull(), // 'protein', 'vegetable', 'fruit', 'supplement', 'treat', 'other'
  description: text('description'),
  color: text('color').default('#94a3b8'), // hex color for UI display
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const feedingRecord = pgTable('feeding_record', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  feedingDate: timestamp('feeding_date').notNull(),
  consumed: text('consumed').notNull(), // 'fully', 'partially', 'refused'
  foodType: text('food_type'),
  quantity: text('quantity'),
  notes: text('notes'),
  weight: doublePrecision('weight'), // total weight of food offered in grams
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  feedingDateIdx: index('feeding_record_feeding_date_idx').on(table.feedingDate.desc()),
  userIdIdx: index('feeding_record_user_id_idx').on(table.userId),
  consumedCheck: check('consumed_check', 
    sql`consumed IN ('fully', 'partially', 'refused')`
  ),
}))

export const feedingRecordTag = pgTable('feeding_record_tag', {
  feedingRecordId: uuid('feeding_record_id').notNull().references(() => feedingRecord.id, { onDelete: 'cascade' }),
  feedingTagId: bigint('feeding_tag_id', { mode: 'number' }).notNull().references(() => feedingTag.id, { onDelete: 'cascade' }),
  quantity: doublePrecision('quantity'), // amount of this specific food item
  quantityUnit: text('quantity_unit').default('g'), // 'g', 'ml', 'pieces', etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.feedingRecordId, table.feedingTagId] }),
}))

export const reminder = pgTable('reminder', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  isReminder: boolean('is_reminder').notNull().default(false),
  dueDate: timestamp('due_date'),
  isCompleted: boolean('is_completed').notNull().default(false),
  notificationId: text('notification_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userDueDateIndex: index('reminder_user_due_date_idx').on(table.userId, table.dueDate.desc().nullsLast()),
  userCreatedAtIndex: index('reminder_user_created_at_idx').on(table.userId, table.createdAt.desc()),
}))

export const measurementLog = pgTable('measurement_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(),
  value: doublePrecision('value'),
  unit: text('unit'),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userRecordedAtIndex: index('measurement_user_recorded_at_idx').on(table.userId, table.recordedAt.desc()),
}))

// Type exports for new feeding tables
export type FeedingTag = InferSelectModel<typeof feedingTag>
export type NewFeedingTag = InferInsertModel<typeof feedingTag>

export type FeedingRecord = InferSelectModel<typeof feedingRecord>
export type NewFeedingRecord = InferInsertModel<typeof feedingRecord>

export type FeedingRecordTag = InferSelectModel<typeof feedingRecordTag>
export type NewFeedingRecordTag = InferInsertModel<typeof feedingRecordTag>

export type Reminder = InferSelectModel<typeof reminder>
export type NewReminder = InferInsertModel<typeof reminder>

export type MeasurementLog = InferSelectModel<typeof measurementLog>
export type NewMeasurementLog = InferInsertModel<typeof measurementLog>
