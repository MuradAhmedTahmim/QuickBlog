import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import BlogCard from '../components/BlogCard'
import EmptyState from '../components/EmptyState'
import Loader from '../components/Loader'
import { BookmarkIcon, UserIcon } from '../components/Icons'
import { useAppContext } from '../context/AppContext'

const Saved = () => {
  const { axios, user, token, setAuthOpen, bookmarkedBlogs, t } = useAppContext()

  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSaved = useCallback(async () => {
    if (!token) { setLoading(false); return }
    setError('')
    try {
      const { data } = await axios.get('/api/user/bookmarks')
      data.success ? setBlogs(data.blogs) : setError(data.message)
    } catch {
      setError(t('saved.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [axios, token, t])

  useEffect(() => { fetchSaved() }, [fetchSaved])

  // Un-saving from a card should remove it from this page straight away.
  useEffect(() => {
    setBlogs((current) => current.filter((blog) => bookmarkedBlogs.has(blog._id)))
  }, [bookmarkedBlogs])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">{t('saved.title')}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {user ? t('saved.subtitleIn') : t('saved.subtitleOut')}
          </p>
        </header>

        {!token ? (
          <div className="qb-card">
            <EmptyState
              icon={UserIcon}
              title={t('saved.signInTitle')}
              description={t('saved.signInBody')}
              action={
                <button
                  type="button" onClick={() => setAuthOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('nav.signIn')}
                </button>
              }
            />
          </div>
        ) : loading ? (
          <Loader label={t('saved.loading')} full={false} />
        ) : error ? (
          <div className="qb-card">
            <EmptyState
              icon={BookmarkIcon}
              title={t('common.somethingWrong')}
              description={error}
              action={
                <button
                  type="button" onClick={() => { setLoading(true); fetchSaved() }}
                  className="px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('common.tryAgain')}
                </button>
              }
            />
          </div>
        ) : blogs.length === 0 ? (
          <div className="qb-card">
            <EmptyState
              icon={BookmarkIcon}
              title={t('saved.emptyTitle')}
              description={t('saved.emptyBody')}
              action={
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t('saved.browse')}
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => <BlogCard key={blog._id} blog={blog} />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default Saved
