import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { MailIcon } from './Icons'

// Now backed by a real endpoint - the address is stored, not thrown away.
const Newsletter = () => {
  const { axios, t } = useAppContext()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const { data } = await axios.post('/api/blog/subscribe', { email })
      if (data.success) {
        toast.success(t('newsletter.subscribed'))
        setEmail('')
        setDone(true)
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error(t('newsletter.failed'))
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
          {t('newsletter.title')}
        </h2>
        <p className="mt-2 mx-auto max-w-md text-sm sm:text-base text-muted">
          {t('newsletter.subtitle')}
        </p>

        {done ? (
          <p className="mt-7 text-sm font-medium text-tealink">
            {t('newsletter.done')}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 mx-auto max-w-md flex flex-col sm:flex-row gap-2.5">
            <label htmlFor="newsletter-email" className="sr-only">{t('newsletter.emailLabel')}</label>
            <input
              id="newsletter-email" type="email" required
              value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder={t('newsletter.placeholder')} autoComplete="email"
              className="flex-1 px-4 py-3 rounded-full bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm"
            />
            <button
              type="submit" disabled={busy}
              className="px-6 py-3 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer whitespace-nowrap"
            >
              {busy ? t('newsletter.subscribing') : t('newsletter.subscribe')}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

export default Newsletter
