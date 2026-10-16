import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import BlogTableItem from '../../components/admin/BlogTableItem'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import { DraftIcon, PlusIcon } from '../../components/Icons'
import { useAppContext } from '../../context/AppContext'

const FILTERS = [
  { key: 'All', labelKey: 'admin.filterAll' },
  { key: 'Published', labelKey: 'admin.filterPublished' },
  { key: 'Drafts', labelKey: 'admin.filterDrafts' },
]

const ListBlog = () => {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const { axios, t } = useAppContext()

  const fetchBlogs = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/blogs')
      data.success ? setBlogs(data.blogs) : toast.error(data.message)
    } catch {
      toast.error(t('admin.blogsFailed'))
    } finally {
      setLoading(false)
    }
  }, [axios, t])

  useEffect(() => { fetchBlogs() }, [fetchBlogs])

  const shown = blogs.filter((blog) =>
    filter === 'All' ? true : filter === 'Published' ? blog.isPublished : !blog.isPublished
  )

  if (loading) return <Loader label={t('admin.loadingBlogs')} />

  const activeFilterLabel = t(FILTERS.find((item) => item.key === filter).labelKey)

  return (
    <div className="p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t('admin.allArticles')}</h1>
          <p className="mt-1 text-sm text-muted">{t('admin.totalCount', { n: blogs.length })}</p>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map(({ key, labelKey }) => (
            <button
              key={key} type="button" onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                filter === key ? 'bg-tealsolid text-onteal font-medium' : 'border border-line text-muted hover:text-ink'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="qb-card">
          <EmptyState
            icon={DraftIcon}
            title={blogs.length === 0 ? t('admin.noneYetTitle') : t('admin.noneFiltered', { filter: activeFilterLabel })}
            description={blogs.length === 0 ? t('admin.noneYetBody') : t('admin.tryFilter')}
            action={blogs.length === 0 && (
              <Link to="/admin/addBlog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity">
                <PlusIcon className="w-4 h-4" /> {t('admin.newArticle')}
              </Link>
            )}
          />
        </div>
      ) : (
        <div className="qb-card overflow-hidden">
          <div className="overflow-x-auto qb-scroll-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted text-left border-b border-line bg-raised/40">
                  <th scope="col" className="px-4 py-3 font-medium">#</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('common.article')}</th>
                  <th scope="col" className="px-4 py-3 font-medium max-sm:hidden">{t('common.date')}</th>
                  <th scope="col" className="px-4 py-3 font-medium max-sm:hidden">{t('common.status')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((blog, index) => (
                  <BlogTableItem key={blog._id} blog={blog} fetchBlogs={fetchBlogs} index={index + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListBlog
