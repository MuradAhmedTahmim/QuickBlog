import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { MailIcon } from './Icons'

// Now backed by a real endpoint - the address is stored, not thrown away.
const Newsletter = () => {
  const { axios } = useAppContext()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const { data } = await axios.post('/api/blog/subscribe', { email })
      if (data.success) {
        toast.success(data.message)
        setEmail('')
        setDone(true)
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Could not subscribe right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="qb-card overflow-hidden">
      <div className="px-6 sm:px-10 py-10 sm:py-12 text-center">
        <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-tealsoft text-tealink">
          <MailIcon className="w-5 h-5" />
        </span>

        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
          Never miss a story
        </h2>
        <p className="mt-2 mx-auto max-w-md text-sm sm:text-base text-muted">
          One email when something new goes up. No noise, unsubscribe whenever.
        </p>

        {done ? (
          <p className="mt-7 text-sm font-medium text-tealink">
            You are on the list. Thanks for reading.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 mx-auto max-w-md flex flex-col sm:flex-row gap-2.5">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email" type="email" required
              value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com" autoComplete="email"
              className="flex-1 px-4 py-3 rounded-full bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm"
            />
            <button
              type="submit" disabled={busy}
              className="px-6 py-3 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer whitespace-nowrap"
            >
              {busy ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

export default Newsletter
