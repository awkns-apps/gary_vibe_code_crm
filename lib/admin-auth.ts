import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const COOKIE_NAME = "admin_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.")
  }
  return secret
}

function signPayload(payload: string): string {
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex")
  return `${payload}.${signature}`
}

function verifySignedToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".")
  if (lastDot === -1) return false

  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  const expected = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex")

  try {
    const sigBuffer = Buffer.from(signature, "hex")
    const expectedBuffer = Buffer.from(expected, "hex")
    if (sigBuffer.length !== expectedBuffer.length) return false
    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  return signPayload(String(expiresAt))
}

function isSessionValid(token: string | undefined): boolean {
  if (!token || !verifySignedToken(token)) return false

  const payload = token.slice(0, token.lastIndexOf("."))
  const expiresAt = Number(payload)
  if (!Number.isFinite(expiresAt)) return false

  return Date.now() < expiresAt
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return isSessionValid(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login")
  }
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not configured.")
  }

  const input = Buffer.from(password)
  const target = Buffer.from(expected)

  if (input.length !== target.length) return false

  return timingSafeEqual(input, target)
}
