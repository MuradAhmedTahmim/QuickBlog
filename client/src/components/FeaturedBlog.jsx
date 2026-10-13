import { Link } from 'react-router-dom'
import Moment from 'moment'
import { ClockIcon, EyeIcon, ArrowRightIcon } from './Icons'
import SaveButton from './SaveButton'
import LikeButton from './LikeButton'
import AuthorChip from './AuthorChip'
import { compactNumber, excerpt } from '../utils/format'

// The single lead article: a wider, calmer layout than the grid cards.
const FeaturedBlog = ({ blog }) => {
  if (!blog) return null

  const { _id, title, description, image, category, readingTime, views, likesCount, author, createdAt } = blog

  return (
    <article className="qb-card qb-shadow overflow-hidden grid md:grid-cols-2">
      <Link to={`/blog/${_id}`} tabIndex={-1} aria-hidden="true" className="block">
        <img
          src={image} alt=""
          className="w-full h-full min-h-56 md:min-h-[22rem] object-cover"
        />
      </Link>

      <div className="p-6 sm:p-9 flex flex-col justify-center">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-tealsoft text-tealink font-medium">Featured</span>
          <span className="text-muted">{category}</span>
        </div>

        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-ink">
          <Link to={`/blog/${_id}`} className="hover:text-tealink transition-colors">{title}</Link>
        </h2>

        <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed line-clamp-3">
          {excerpt(description, 210)}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <AuthorChip author={author} size="lg" subtitle={Moment(createdAt).format('MMMM D, YYYY')} />

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><ClockIcon className="w-4 h-4" />{readingTime || 1} min read</span>
            {views > 0 && <span className="inline-flex items-center gap-1"><EyeIcon className="w-4 h-4" />{compactNumber(views)}</span>}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-line flex items-center gap-3">
          <Link
            to={`/blog/${_id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Read article <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <LikeButton blogId={_id} count={likesCount || 0} />
          <SaveButton blogId={_id} variant="full" />
        </div>
      </div>
    </article>
  )
}

export default FeaturedBlog
