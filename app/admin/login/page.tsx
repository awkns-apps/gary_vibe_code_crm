import type { Metadata } from 'next'
import { redirectIfAuthenticated } from '@/app/actions/admin'
import { AdminLoginForm } from '@/components/admin-login-form'

export const metadata: Metadata = {
  title: 'Admin Sign In',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLoginPage() {
  await redirectIfAuthenticated()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <AdminLoginForm />
    </main>
  )
}
