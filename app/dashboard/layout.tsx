import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/login')
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar email={session.email} />
      <main className="flex-1 ml-52 min-h-screen">
        <div className="max-w-[1400px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
