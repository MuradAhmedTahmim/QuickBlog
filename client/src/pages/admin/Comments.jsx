import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import CommentTableItem from '../../components/admin/CommentTableItem'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import { CommentIcon } from '../../components/Icons'
import { useAppContext } from '../../context/AppContext'

const Comments = () => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Not Approved')
  const { axios, t } = useAppContext()

  const fetchComments = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/comments')
      data.success ? setComments(data.comments) : toast.error(data.message)
    } catch {
      toast.error(t('admin.commentsFailed'))
    } finally {
      setLoading(false)
    }
  }, [axios, t])

  useEffect(() => { fetchComments() }, [fetchComments])

  const shown = comments.filter((comment) =>
    filter === 'Approved' ? comment.isApproved : !comment.isApproved
  )
  const pending = comments.filter((comment) => !comment.isApproved).length

  if (loading) return <Loader label={t('admin.loadingComments')} />

  return (
    <div className="p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t('admin.commentsTitle')}</h1>
          <p className="mt-1 text-sm text-muted">
            {pending > 0 ? t('admin.awaitingReview', { n: pending }) : t('admin.everythingReviewed')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['Not Approved', 'Approved'].map((item) => (
            <button
              key={item} type="button" onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                filter === item ? 'bg-tealsolid text-onteal font-medium' : 'border border-line text-muted hover:text-ink'
              }`}
            >
              {item === 'Not Approved' ? t('admin.pending') : t('admin.approved')}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="qb-card">
          <EmptyState
            icon={CommentIcon}
            title={filter === 'Approved' ? t('admin.noApproved') : t('admin.nothingPending')}
            description={filter === 'Approved' ? t('admin.noApprovedBody') : t('admin.nothingPendingBody')}
          />
        </div>
      ) : (
        <div className="qb-card overflow-hidden">
          <div className="overflow-x-auto qb-scroll-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted text-left border-b border-line bg-raised/40">
                  <th scope="col" className="px-4 py-3 font-medium">{t('admin.commentColumn')}</th>
                  <th scope="col" className="px-4 py-3 font-medium max-sm:hidden">{t('common.date')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((comment) => (
                  <CommentTableItem key={comment._id} comment={comment} fetchComments={fetchComments} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Comments
