import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { CloseIcon } from './Icons'

// One dialog for both sign in and sign up, opened whenever an action needs an
// account (liking, saving) so the reader never loses their place.
const AuthModal = () => {
  const { authOpen, setAuthOpen, authenticate, t } = useAppContext()

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const dialogRef = useRef(null)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (!authOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAuthOpen(false)

      // Keep tabbing inside the dialog while it is open.
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    firstFieldRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [authOpen, setAuthOpen, mode])

  if (!authOpen) return null

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = mode === 'register' ? { name, email, password } : { email, password }
      const data = await authenticate(mode, payload)
      if (data.success) {
        toast.success(t(mode === 'register' ? 'auth.welcomeNew' : 'auth.welcomeBack', { name: data.user.name }))
        setAuthOpen(false)
        setName(''); setEmail(''); setPassword('')
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error(t('auth.failed'))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy/50 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && setAuthOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="qb-card qb-shadow-lg w-full max-w-sm p-6 relative"
      >
        <button
          type="button"
          onClick={() => setAuthOpen(false)}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <h2 id="auth-title" className="text-xl font-semibold text-ink">
          {t(mode === 'register' ? 'auth.createTitle' : 'auth.welcomeTitle')}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t(mode === 'register' ? 'auth.createSubtitle' : 'auth.welcomeSubtitle')}
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-muted mb-1.5">{t('common.name')}</label>
              <input
                id="auth-name" ref={mode === 'register' ? firstFieldRef : null}
                value={name} onChange={(e) => setName(e.target.value)}
                required minLength={2} maxLength={60} autoComplete="name"
                className={field} placeholder={t('auth.namePlaceholder')}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-muted mb-1.5">{t('common.email')}</label>
            <input
              id="auth-email" ref={mode === 'login' ? firstFieldRef : null}
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className={field} placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-muted mb-1.5">{t('common.password')}</label>
            <input
              id="auth-password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className={field} placeholder={t(mode === 'register' ? 'auth.passwordNew' : 'auth.passwordCurrent')}
            />
          </div>

          <button
            type="submit" disabled={busy}
            className="mt-1 w-full py-2.5 rounded-lg bg-tealsolid text-onteal font-medium
              hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
          >
            {busy ? t('auth.wait') : t(mode === 'register' ? 'auth.createAccount' : 'auth.signIn')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {t(mode === 'register' ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            className="text-tealink font-medium hover:underline cursor-pointer"
          >
            {t(mode === 'register' ? 'auth.signIn' : 'auth.signUp')}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthModal
