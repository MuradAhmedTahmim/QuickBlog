import { useState } from 'react'
import { Link } from 'react-router-dom'
import Moment from 'moment'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { EditIcon, EyeIcon, HeartIcon, TrashIcon } from '../Icons'
import { compactNumber } from '../../utils/format'

const BlogTableItem = ({ blog, fetchBlogs, index }) => {
  const { axios } = useAppContext()
  const [busy, setBusy] = useState(false)

  const deleteBlog = async () => {
    if (!window.confirm(`Delete "${blog.title}"? Its comments will be removed too. This cannot be undone.`)) return
    setBusy(true)
    try {
      const { data } = await axios.post('/api/blog/delete', { id: blog._id })
      data.success ? (toast.success(data.message), await fetchBlogs()) : toast.error(data.message)
    } catch {
      toast.error('Could not delete the blog.')
    } finally {
      setBusy(false)
    }
  }

  const togglePublish = async () => {
    setBusy(true)
    try {
      const { data } = await axios.post('/api/blog/toggle-publish', { id: blog._id })
      data.success ? (toast.success(data.message), await fetchBlogs()) : toast.error(data.message)
    } catch {
      toast.error('Could not update the blog.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3.5 text-muted tabular-nums">{index}</td>

      <td className="px-4 py-3.5">
        <Link to={`/blog/${blog._id}`} className="font-medium text-ink hover:text-tealink transition-colors line-clamp-1">
          {blog.title}
        </Link>
        <span className="mt-0.5 flex items-center gap-3 text-xs text-muted">
          <span>{blog.category}</span>
          <span className="inline-flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" />{compactNumber(blog.views || 0)}</span>
          <span className="inline-flex items-center gap-1"><HeartIcon className="w-3.5 h-3.5" />{compactNumber(blog.likesCount || 0)}</span>
        </span>
      </td>

      <td className="px-4 py-3.5 text-muted whitespace-nowrap max-sm:hidden">
        {Moment(blog.createdAt).format('MMM D, YYYY')}
      </td>

      <td className="px-4 py-3.5 max-sm:hidden">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
          blog.isPublished ? 'bg-tealsoft text-tealink' : 'bg-raised text-muted'
        }`}>
          {blog.isPublished ? 'Published' : 'Draft'}
        </span>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={togglePublish} disabled={busy}
            className="px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-tealink hover:border-tealsolid/50 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {blog.isPublished ? 'Unpublish' : 'Publish'}
          </button>
          <Link
            to={`/admin/editBlog/${blog._id}`}
            aria-label={`Edit ${blog.title}`} title="Edit"
            className="grid place-items-center w-8 h-8 rounded-full text-muted hover:text-tealink hover:bg-tealsoft transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </Link>
          <button
            type="button" onClick={deleteBlog} disabled={busy}
            aria-label={`Delete ${blog.title}`} title="Delete"
            className="grid place-items-center w-8 h-8 rounded-full text-muted hover:text-red-600 hover:bg-red-500/10 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default BlogTableItem
