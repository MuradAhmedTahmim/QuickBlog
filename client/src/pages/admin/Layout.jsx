import { Link, Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/admin/Sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import { LogOutIcon, Wordmark } from '../../components/Icons'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {
  const navigate = useNavigate()
  const { logout, user } = useAppContext()

  const signOut = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="h-16 shrink-0 px-5 sm:px-8 flex items-center justify-between gap-4 border-b border-line bg-surface">
        <Link to="/" className="text-ink" aria-label="Back to site">
          <Wordmark className="text-sm" />
        </Link>

        <div className="flex items-center gap-2.5">
          {user && <span className="hidden sm:block text-sm text-muted truncate max-w-40">{user.name}</span>}
          <ThemeToggle />
          <button
            type="button" onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <LogOutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
