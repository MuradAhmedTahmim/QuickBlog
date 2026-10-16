import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { ArrowLeftIcon, Wordmark } from '../Icons'
import ThemeToggle from '../ThemeToggle'
import LanguageToggle from '../LanguageToggle'

const Login = () => {
  const { axios, setToken, setUser, t } = useAppContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      // Trimmed so a stray space pasted from .env does not block sign in.
      const { data } = await axios.post('/api/admin/login', {
        email: email.trim(),
        password: password.trim(),
      })

      if (data.success) {
        setToken(data.token)
        if (data.user) setUser(data.user)
        toast.success(t('auth.welcomeTitle'))
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error(t('admin.unreachable'))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm'

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-tealink transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> {t('nav.backToSite')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="qb-card qb-shadow-lg p-7 mt-5">
          <div className="text-ink"><Wordmark className="text-sm" /></div>

          <h1 className="mt-5 text-xl font-semibold text-ink">{t('admin.signInTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('admin.signInSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium text-muted mb-1.5">{t('common.email')}</label>
              <input
                id="admin-email" type="email" required autoComplete="username"
                value={email} onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.emailPlaceholder')} className={field}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-muted mb-1.5">{t('common.password')}</label>
              <input
                id="admin-password" type="password" required autoComplete="current-password"
                value={password} onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.passwordCurrent')} className={field}
              />
            </div>

            <button
              type="submit" disabled={busy}
              className="mt-1 w-full py-2.5 rounded-lg bg-tealsolid text-onteal font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {busy ? t('admin.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
