import { logoutAdmin } from '@/app/actions/admin'
import { buttonVariants } from '@/components/ui/button'

export function AdminLogoutButton() {
  return (
    <form action={logoutAdmin}>
      <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        登出
      </button>
    </form>
  )
}
