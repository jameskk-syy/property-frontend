import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import IdleLogoutManager from '../patterns/IdleLogoutManager'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Auto sign-out after 10 minutes of inactivity (warns first). */}
      <IdleLogoutManager />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
