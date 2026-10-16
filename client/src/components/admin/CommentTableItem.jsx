import { useState } from 'react'
import Moment from 'moment'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { CheckIcon, TrashIcon } from '../Icons'

const CommentTableItem = ({ comment, fetchComments }) => {
  const { axios, t } = useAppContext()
  const [busy, setBusy] = useState(false)

  const approveComment = async () => {
    setBusy(true)
    try {
      const { data } = await axios.post('/api/admin/approve-comment', { id: comment._id })
      data.success ? (toast.success(t('admin.commentApproved')), fetchComments()) : toast.error(data.message)
    } catch {
      toast.error(t('admin.approveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const deleteComment = async () => {
    if (!window.confirm(t('admin.confirmDeleteComment'))) return
    setBusy(true)
    try {
      const { data } = await axios.post('/api/admin/delete-comment', { id: comment._id })
      data.success ? (toast.success(t('admin.commentDeleted')), fetchComments()) : toast.error(data.message)
    } catch {
      toast.error(t('admin.deleteCommentFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="px-4 py-4">
        <p className="text-xs text-muted">
          {t('admin.onBlog')}{' '}
          <span className="text-ink font-medium">{comment.blog?.title || t('admin.deletedBlog')}</span>
        </p>
        <p className="mt-2 text-sm font-medium text-ink">{comment.name}</p>
        <p className="mt-1 text-sm text-muted leading-relaxed whitespace-pre-line">{comment.content}</p>
      </td>

      <td className="px-4 py-4 text-muted whitespace-nowrap max-sm:hidden">
        {Moment(comment.createdAt).format('MMM D, YYYY')}
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {comment.isApproved ? (
            <span className="px-2.5 py-1 rounded-full bg-tealsoft text-tealink text-xs font-medium whitespace-nowrap">
              {t('admin.approved')}
            </span>
          ) : (
            <button
              type="button" onClick={approveComment} disabled={busy}
              aria-label={t('admin.approveAria')} title={t('admin.approveAria')}
              className="grid place-items-center w-8 h-8 rounded-full text-muted hover:text-tealink hover:bg-tealsoft disabled:opacity-60 transition-colors cursor-pointer"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button" onClick={deleteComment} disabled={busy}
            aria-label={t('admin.deleteCommentAria')} title={t('admin.deleteCommentAria')}
            className="grid place-items-center w-8 h-8 rounded-full text-muted hover:text-red-600 hover:bg-red-500/10 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default CommentTableItem
