"use server"

import { db } from "@/lib/db"
import { contactMessages } from "@/lib/db/schema"

export type ContactInput = {
  name: string
  email: string
  subject: string
  message: string
}

export type ContactResult = {
  success: boolean
  error?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function submitContactMessage(input: ContactInput): Promise<ContactResult> {
  const name = input.name?.trim() ?? ""
  const email = input.email?.trim() ?? ""
  const subject = input.subject?.trim() ?? ""
  const message = input.message?.trim() ?? ""

  if (!name || !email || !subject || !message) {
    return { success: false, error: "All fields are required." }
  }

  if (!emailPattern.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  if (message.length < 10) {
    return { success: false, error: "Your message should be at least 10 characters." }
  }

  try {
    await db.insert(contactMessages).values({ name, email, subject, message })
    return { success: true }
  } catch (error) {
    console.log("[v0] Failed to save contact message:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
