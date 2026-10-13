import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { ArrowLeftIcon, Wordmark } from '../Icons'

const Login = () => {
  const { axios, setToken, setUser } = useAppContext()

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
        toast.success('Welcome back')
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Could not reach the server. Is it running?')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm'

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-tealink transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back to site
        </Link>

        <div className="qb-card qb-shadow-lg p-7 mt-5">
          <div className="text-ink"><Wordmark className="text-sm" /></div>

          <h1 className="mt-5 text-xl font-semibold text-ink">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">Enter your credentials to manage the blog.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium text-muted mb-1.5">Email</label>
              <input
                id="admin-email" type="email" required autoComplete="username"
                value={email} onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com" className={field}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-muted mb-1.5">Password</label>
              <input
                id="admin-password" type="password" required autoComplete="current-password"
                value={password} onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password" className={field}
              />
            </div>

            <button
              type="submit" disabled={busy}
              className="mt-1 w-full py-2.5 rounded-lg bg-tealsolid text-onteal font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
