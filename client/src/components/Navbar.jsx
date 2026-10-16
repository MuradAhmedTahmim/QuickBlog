import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { BookmarkIcon, LogOutIcon, MenuIcon, CloseIcon, UserIcon, Wordmark } from './Icons'
import { initials } from '../utils/format'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, isAdmin, logout, setAuthOpen, t } = useAppContext()

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    const onEscape = (event) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const navLink = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'text-tealink font-medium' : 'text-muted hover:text-ink'}`

  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md border-b border-line">
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" aria-label={t('nav.homeAria')} className="text-ink shrink-0">
          <Wordmark className="text-sm sm:text-base" />
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <NavLink to="/" end className={navLink}>{t('nav.home')}</NavLink>
          <NavLink to="/saved" className={navLink}>{t('nav.saved')}</NavLink>
          {isAdmin && <NavLink to="/admin" className={navLink}>{t('nav.dashboard')}</NavLink>}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu" aria-expanded={menuOpen}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-line hover:border-tealsolid/50 transition-colors cursor-pointer"
              >
                {user.image
                  ? <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <span className="w-7 h-7 rounded-full bg-tealsoft text-tealink grid place-items-center text-[11px] font-semibold">{initials(user.name)}</span>}
                <span className="hidden sm:block text-sm text-ink max-w-24 truncate">{user.name}</span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 qb-card qb-shadow-lg py-1.5 overflow-hidden"
                >
                  <div className="px-3.5 py-2 border-b border-line">
                    <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/saved" role="menuitem" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-raised transition-colors"
                  >
                    <BookmarkIcon className="w-4 h-4 text-muted" /> {t('nav.savedArticles')}
                  </Link>
                  <Link
                    to={`/author/${user._id}`} role="menuitem" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-raised transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-muted" /> {t('nav.myProfile')}
                  </Link>
                  <button
                    type="button" role="menuitem"
                    onClick={() => { setMenuOpen(false); logout(); navigate('/') }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-raised transition-colors cursor-pointer"
                  >
                    <LogOutIcon className="w-4 h-4 text-muted" /> {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="px-4 sm:px-5 py-2 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              {t('nav.signIn')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={t('nav.menu')} aria-expanded={mobileOpen}
            className="md:hidden grid place-items-center w-9 h-9 rounded-full border border-line text-muted cursor-pointer"
          >
            {mobileOpen ? <CloseIcon className="w-[18px] h-[18px]" /> : <MenuIcon className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-line px-5 py-3 flex flex-col gap-1">
          <NavLink to="/" end onClick={() => setMobileOpen(false)} className="py-2 text-sm text-ink">{t('nav.home')}</NavLink>
          <NavLink to="/saved" onClick={() => setMobileOpen(false)} className="py-2 text-sm text-ink">{t('nav.saved')}</NavLink>
          {isAdmin && <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="py-2 text-sm text-ink">{t('nav.dashboard')}</NavLink>}
        </div>
      )}
    </header>
  )
}

export default Navbar
