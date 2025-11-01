import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

import type { User } from '../db/schema'

const PASSWORD_SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(PASSWORD_SALT_ROUNDS)
  return bcrypt.hash(password, salt)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export type PublicUser = Omit<User, 'passwordHash'>

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

