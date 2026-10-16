import { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import BlogCard from './BlogCard'
import { TrendingIcon } from './Icons'

// Ranking is done on the server from real views, likes and comments weighted
// against age; this only renders what comes back.
const TrendingList = ({ limit = 5 }) => {
  const { axios, t, n } = useAppContext()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    axios.get(`/api/blog/trending?limit=${limit}`)
      .then(({ data }) => { if (active && data.success) setBlogs(data.blogs) })
      .catch(() => { /* a quiet failure is better than an error box in a sidebar */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [axios, limit])

  // With almost nothing published, a "trending" list would just repeat the grid.
  if (loading || blogs.length < 3) return null

  return (
    <aside aria-labelledby="trending-heading" className="qb-card p-5">
      <h2 id="trending-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <TrendingIcon className="w-4 h-4 text-tealink" />
        {t('trending.title')}
      </h2>
      <p className="mt-1 text-xs text-muted">{t('trending.subtitle')}</p>

      <ol className="mt-4 flex flex-col gap-3">
        {blogs.map((blog, index) => (
          <li key={blog._id} className="flex gap-3 items-start">
            <span className="mt-2 w-5 shrink-0 text-sm font-semibold text-muted tabular-nums">
              {n(index + 1)}
            </span>
            <div className="min-w-0 flex-1">
              <BlogCard blog={blog} compact />
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export default TrendingList
