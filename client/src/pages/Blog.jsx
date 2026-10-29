import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Moment from 'moment'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import BlogCard from '../components/BlogCard'
import EmptyState from '../components/EmptyState'
import LikeButton from '../components/LikeButton'
import SaveButton from '../components/SaveButton'
import AuthorChip from '../components/AuthorChip'
import { ArrowLeftIcon, ClockIcon, CommentIcon, EyeIcon } from '../components/Icons'
import { useAppContext } from '../context/AppContext'
import { compactNumber, initials } from '../utils/format'

const Blog = () => {
  const { id } = useParams()
  const { axios, blogs, user, requireAuth, t, n } = useAppContext()

  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const fetchBlogData = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/blog/${id}`)
      data.success ? setData(data.blog) : setNotFound(true)
    } catch {
      setNotFound(true)
    }
  }, [axios, id])

  const fetchComments = useCallback(async (blogId) => {
    try {
      const { data } = await axios.get(`/api/blog/comments/${blogId}`)
      if (data.success) setComments(data.comments)
    } catch {
      /* comments are secondary - the article still reads without them */
    }
  }, [axios])

  // Re-run on id so moving between related articles reloads the page content.
  useEffect(() => {
    setData(null)
    setNotFound(false)
    setComments([])
    window.scrollTo({ top: 0 })
    fetchBlogData()
  }, [fetchBlogData])

  // Waits for the article, because the URL may carry a slug while the comment
  // routes work on its id.
  useEffect(() => {
    if (data?._id) fetchComments(data._id)
  }, [data?._id, fetchComments])

  const related = useMemo(() => {
    if (!data) return []
    return blogs
      .filter((blog) => blog._id !== data._id && blog.category === data.category)
      .slice(0, 3)
  }, [blogs, data])

  const addComment = async (event) => {
    event.preventDefault()
    // Comments are signed, so an anonymous reader gets the sign-in prompt
    // first. Their draft is still in the box when they come back.
    if (!requireAuth()) return

    setPosting(true)
    try {
      const { data: result } = await axios.post('/api/blog/add-comment', { blog: data._id, content })
      if (result.success) {
        toast.success(t('article.commentQueued'))
        setContent('')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error(t('article.postFailed'))
    } finally {
      setPosting(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-16">
          <div className="qb-card">
            <EmptyState
              icon={CommentIcon}
              title={t('article.notFoundTitle')}
              description={t('article.notFoundBody')}
              action={
                <Link to="/" className="inline-block px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity">
                  {t('article.backToAll')}
                </Link>
              }
            />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Loader label={t('article.loading')} />
      </div>
    )
  }

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-canvas border border-line text-ink placeholder:text-muted/70 outline-none focus:border-tealsolid transition-colors text-sm'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <article>
          {/* Header */}
          <header className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-tealink transition-colors">
              <ArrowLeftIcon className="w-4 h-4" /> {t('article.allArticles')}
            </Link>

            <div className="mt-6 flex items-center gap-2.5 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-tealsoft text-tealink font-medium">{t(`categories.${data.category}`)}</span>
              <time dateTime={data.createdAt} className="text-muted">
                {Moment(data.createdAt).format('MMMM D, YYYY')}
              </time>
            </div>

            <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-ink">
              {data.title}
            </h1>

            {data.subTitle && (
              <p className="mt-4 text-lg text-muted leading-relaxed">{data.subTitle}</p>
            )}

            <div className="mt-7 pb-7 border-b border-line flex flex-wrap items-center justify-between gap-4">
              <AuthorChip author={data.author} size="lg" subtitle={data.author?.bio ? null : t('article.writerAt')} />

              <div className="flex items-center gap-3.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5" title={t('common.readTimeHint', { n: data.readingTime || 1 })}>
                  <ClockIcon className="w-4 h-4" /> {t('common.minRead', { n: data.readingTime || 1 })}
                </span>
                <span className="inline-flex items-center gap-1.5" title={t('article.viewsHint', { n: data.views || 0 })}>
                  <EyeIcon className="w-4 h-4" /> {n(compactNumber(data.views || 0))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CommentIcon className="w-4 h-4" /> {n(comments.length)}
                </span>
              </div>
            </div>
          </header>

          <figure className="max-w-5xl mx-auto px-5 sm:px-8 mt-10">
            <img src={data.image} alt="" className="w-full rounded-2xl aspect-[16/9] object-cover" />
          </figure>

          {/* Article content is shown exactly as written - never translated. */}
          <div
            className="rich-text max-w-3xl mx-auto px-5 sm:px-8 mt-12"
            dangerouslySetInnerHTML={{ __html: data.description }}
          />

          {/* Reactions */}
          <div className="max-w-3xl mx-auto px-5 sm:px-8 mt-14">
            <div className="qb-card p-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">{t('article.useful')}</p>
              <div className="flex items-center gap-2.5">
                <LikeButton blogId={data._id} count={data.likesCount || 0} />
                <SaveButton blogId={data._id} variant="full" />
              </div>
            </div>
          </div>
        </article>

        {/* Comments */}
        <section aria-labelledby="comments-heading" className="max-w-3xl mx-auto px-5 sm:px-8 mt-14">
          <h2 id="comments-heading" className="text-xl font-semibold tracking-tight text-ink">
            {t('article.comments')} {comments.length > 0 && <span className="text-muted font-normal">({n(comments.length)})</span>}
          </h2>

          {comments.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('article.noComments')}</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {comments.map((item) => (
                <li key={item._id} className="qb-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-navysoft text-tealink grid place-items-center text-xs font-semibold shrink-0">
                        {initials(item.name)}
                      </span>
                      <p className="font-medium text-sm text-ink truncate">{item.name}</p>
                    </div>
                    <time dateTime={item.createdAt} className="text-xs text-muted shrink-0">
                      {Moment(item.createdAt).fromNow()}
                    </time>
                  </div>
                  <p className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-line">{item.content}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addComment} className="qb-card p-5 sm:p-6 mt-8">
            <h3 className="text-base font-semibold text-ink">{t('article.leaveComment')}</h3>
            <p className="mt-1 text-xs text-muted">{t('article.moderationNote')}</p>

            <div className="mt-4 flex flex-col gap-3.5">
              {/* The name is taken from the account, so it is shown, not typed. */}
              <p className="text-xs text-muted">
                {user
                  ? t('article.commentingAs', { name: user.name })
                  : t('article.commentSignInNote')}
              </p>

              <div>
                <label htmlFor="comment-body" className="block text-xs font-medium text-muted mb-1.5">{t('article.commentLabel')}</label>
                <textarea
                  id="comment-body" value={content} onChange={(event) => setContent(event.target.value)}
                  required minLength={2} maxLength={1000} rows={4}
                  className={`${field} resize-y`} placeholder={t('article.commentPlaceholder')}
                />
              </div>

              <button
                type="submit" disabled={posting}
                className="self-start px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
              >
                {posting ? t('article.posting') : user ? t('article.post') : t('article.signInToPost')}
              </button>
            </div>
          </form>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="max-w-7xl mx-auto px-5 sm:px-8 mt-20">
            <h2 id="related-heading" className="text-xl font-semibold tracking-tight text-ink mb-6">
              {t('article.moreIn', { category: t(`categories.${data.category}`) })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((blog) => <BlogCard key={blog._id} blog={blog} />)}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default Blog
