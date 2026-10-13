import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import BlogTableItem from '../../components/admin/BlogTableItem'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import { DraftIcon, PlusIcon } from '../../components/Icons'
import { useAppContext } from '../../context/AppContext'

const FILTERS = ['All', 'Published', 'Drafts']

const ListBlog = () => {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const { axios } = useAppContext()

  const fetchBlogs = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/blogs')
      data.success ? setBlogs(data.blogs) : toast.error(data.message)
    } catch {
      toast.error('Could not load your blogs.')
    } finally {
      setLoading(false)
    }
  }, [axios])

  useEffect(() => { fetchBlogs() }, [fetchBlogs])

  const shown = blogs.filter((blog) =>
    filter === 'All' ? true : filter === 'Published' ? blog.isPublished : !blog.isPublished
  )

  if (loading) return <Loader label="Loading blogs" />

  return (
    <div className="p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">All articles</h1>
          <p className="mt-1 text-sm text-muted">{blogs.length} total</p>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item} type="button" onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                filter === item ? 'bg-tealsolid text-onteal font-medium' : 'border border-line text-muted hover:text-ink'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="qb-card">
          <EmptyState
            icon={DraftIcon}
            title={blogs.length === 0 ? 'No articles yet' : `No ${filter.toLowerCase()} articles`}
            description={blogs.length === 0 ? 'Write your first article to get started.' : 'Try a different filter.'}
            action={blogs.length === 0 && (
              <Link to="/admin/addBlog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity">
                <PlusIcon className="w-4 h-4" /> New article
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
                  <th scope="col" className="px-4 py-3 font-medium">Article</th>
                  <th scope="col" className="px-4 py-3 font-medium max-sm:hidden">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium max-sm:hidden">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Actions</th>
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
