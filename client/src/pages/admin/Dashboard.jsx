import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Moment from 'moment'
import toast from 'react-hot-toast'
import BlogTableItem from '../../components/admin/BlogTableItem'
import EngagementChart from '../../components/admin/EngagementChart'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import { ChartIcon, CommentIcon, DraftIcon, EyeIcon, HeartIcon, ListIcon, MailIcon, PlusIcon } from '../../components/Icons'
import { useAppContext } from '../../context/AppContext'
import { compactNumber } from '../../utils/format'

const StatTile = ({ icon: Icon, label, value, hint }) => (
  <div className="qb-card p-4">
    <div className="flex items-center gap-2 text-muted">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    {/* Proportional figures: these are headline numbers, not a column. */}
    <p className="mt-2 text-2xl font-semibold text-ink">{compactNumber(value)}</p>
    {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
  </div>
)

const EMPTY = {
  blogs: 0, comments: 0, drafts: 0, published: 0, pendingComments: 0,
  likes: 0, subscribers: 0, views: 0, uniqueViews: 0,
  recentBlogs: [], topViewed: [], topEngaged: [], recentComments: [], series: null,
}

const Dashboard = () => {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const { axios } = useAppContext()

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/dashboard')
      data.success ? setData({ ...EMPTY, ...data.dashboardData }) : toast.error(data.message)
    } catch {
      toast.error('Could not load the dashboard.')
    } finally {
      setLoading(false)
    }
  }, [axios])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  if (loading) return <Loader label="Loading analytics" />

  const hasAnything = data.blogs > 0

  return (
    <div className="p-5 sm:p-8 space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">How your writing is being read right now.</p>
      </header>

      {!hasAnything ? (
        <div className="qb-card">
          <EmptyState
            icon={DraftIcon}
            title="No articles yet"
            description="Publish your first article and your analytics will start filling in here."
            action={
              <Link to="/admin/addBlog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity">
                <PlusIcon className="w-4 h-4" /> Write your first article
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatTile icon={ListIcon} label="Published" value={data.published} hint={`${data.drafts} draft${data.drafts === 1 ? '' : 's'}`} />
            <StatTile icon={EyeIcon} label="Total views" value={data.views} hint={`${compactNumber(data.uniqueViews)} unique readers`} />
            <StatTile icon={HeartIcon} label="Likes" value={data.likes} />
            <StatTile icon={CommentIcon} label="Comments" value={data.comments} hint={data.pendingComments > 0 ? `${data.pendingComments} awaiting review` : 'All reviewed'} />
          </div>

          {data.series && <EngagementChart series={data.series} />}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Most viewed */}
            <section className="qb-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <EyeIcon className="w-4 h-4 text-muted" /> Most viewed
              </h2>
              {data.topViewed.length === 0 || data.topViewed.every((blog) => !blog.views) ? (
                <p className="mt-4 text-sm text-muted">No views recorded yet.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {data.topViewed.filter((blog) => blog.views > 0).map((blog, index) => (
                    <li key={blog._id} className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-muted tabular-nums">{index + 1}</span>
                      <Link to={`/blog/${blog._id}`} className="min-w-0 flex-1 text-sm text-ink hover:text-tealink transition-colors line-clamp-1">
                        {blog.title}
                      </Link>
                      <span className="shrink-0 text-sm tabular-nums text-muted">{compactNumber(blog.views)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Most engaged */}
            <section className="qb-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ChartIcon className="w-4 h-4 text-muted" /> Most engaged
              </h2>
              <p className="mt-0.5 text-xs text-muted">Weighted by likes and comments</p>
              {data.topEngaged.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No likes or comments yet.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {data.topEngaged.map((blog, index) => (
                    <li key={blog._id} className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-muted tabular-nums">{index + 1}</span>
                      <Link to={`/blog/${blog._id}`} className="min-w-0 flex-1 text-sm text-ink hover:text-tealink transition-colors line-clamp-1">
                        {blog.title}
                      </Link>
                      <span className="shrink-0 flex items-center gap-2.5 text-xs tabular-nums text-muted">
                        <span className="inline-flex items-center gap-1"><HeartIcon className="w-3.5 h-3.5" />{blog.likesCount || 0}</span>
                        <span className="inline-flex items-center gap-1"><CommentIcon className="w-3.5 h-3.5" />{blog.commentsCount || 0}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Latest blogs */}
            <section className="qb-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-5 pb-4">
                <h2 className="text-sm font-semibold text-ink">Latest articles</h2>
                <Link to="/admin/listBlog" className="text-xs text-tealink hover:underline">View all</Link>
              </div>
              <div className="overflow-x-auto qb-scroll-x">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted text-left border-y border-line bg-raised/40">
                      <th scope="col" className="px-4 py-2.5 font-medium">#</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Article</th>
                      <th scope="col" className="px-4 py-2.5 font-medium max-sm:hidden">Date</th>
                      <th scope="col" className="px-4 py-2.5 font-medium max-sm:hidden">Status</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBlogs.map((blog, index) => (
                      <BlogTableItem key={blog._id} blog={blog} fetchBlogs={fetchDashboard} index={index + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent activity */}
            <section className="qb-card p-5">
              <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
              {data.recentComments.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No comments yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {data.recentComments.map((comment) => (
                    <li key={comment._id} className="flex gap-3">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${comment.isApproved ? 'bg-tealsolid' : 'bg-muted/50'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className="font-medium">{comment.name}</span>
                          <span className="text-muted"> commented on </span>
                          <span className="font-medium">{comment.blog?.title || 'a deleted article'}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {Moment(comment.createdAt).fromNow()}
                          {!comment.isApproved && <span className="text-muted"> &middot; awaiting review</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 pt-4 border-t border-line flex items-center gap-2 text-xs text-muted">
                <MailIcon className="w-4 h-4" />
                {data.subscribers} newsletter subscriber{data.subscribers === 1 ? '' : 's'}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
