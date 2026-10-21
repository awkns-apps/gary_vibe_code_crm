"use server"

import { redirect } from "next/navigation"
import {
  clearAdminSession,
  isAdminAuthenticated,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth"

export type AdminLoginResult = {
  success: boolean
  error?: string
}

export async function loginAdmin(password: string): Promise<AdminLoginResult> {
  const trimmed = password.trim()

  if (!trimmed) {
    return { success: false, error: "Please enter the admin password." }
  }

  try {
    if (!verifyAdminPassword(trimmed)) {
      return { success: false, error: "Incorrect password." }
    }
  } catch {
    return {
      success: false,
      error: "Admin login is not configured. Set ADMIN_PASSWORD.",
    }
  }

  await setAdminSession()
  redirect("/admin")
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession()
  redirect("/admin/login")
}

export async function redirectIfAuthenticated(): Promise<void> {
  if (await isAdminAuthenticated()) {
    redirect("/admin")
  }
}
