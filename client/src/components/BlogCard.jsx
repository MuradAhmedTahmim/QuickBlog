import { Link } from 'react-router-dom';
import Moment from 'moment';
import { ClockIcon, EyeIcon } from './Icons';
import SaveButton from './SaveButton';
import LikeButton from './LikeButton';
import AuthorChip from './AuthorChip';
import { compactNumber, excerpt } from '../utils/format';
import { useAppContext } from '../context/AppContext';

const BlogCard = ({ blog, compact = false }) => {
  const { title, description, category, image, _id, readingTime, views, likesCount, author, createdAt } = blog;
  const { t, n } = useAppContext();

  const minutes = readingTime || 1;

  if (compact) {
    return (
      <Link
        to={`/blog/${_id}`}
        className="group flex gap-3.5 items-start p-2 -mx-2 rounded-xl hover:bg-raised/60 transition-colors"
      >
        <img
          src={image} alt="" loading="lazy"
          className="w-20 h-16 rounded-lg object-cover shrink-0"
        />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-tealink">{t(`categories.${category}`)}</span>
          <span className="mt-0.5 block text-sm font-medium text-ink leading-snug line-clamp-2 group-hover:text-tealink transition-colors">
            {title}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs text-muted">
            <ClockIcon className="w-3.5 h-3.5" />
            {t('common.min', { n: minutes })}
            {views > 0 && (
              <>
                <span aria-hidden="true">&middot;</span>
                <EyeIcon className="w-3.5 h-3.5" />
                {n(compactNumber(views))}
              </>
            )}
          </span>
        </span>
      </Link>
    )
  }

  return (
    <article className="group qb-card qb-shadow overflow-hidden flex flex-col h-full transition-shadow hover:qb-shadow-lg">
      <div className="relative">
        <Link to={`/blog/${_id}`} tabIndex={-1} aria-hidden="true">
          {/* A fixed ratio keeps every card in the grid the same height. */}
          <img
            src={image} alt="" loading="lazy"
            className="w-full aspect-[16/10] object-cover"
          />
        </Link>
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-sm text-xs font-medium text-tealink">
          {t(`categories.${category}`)}
        </span>
        <SaveButton blogId={_id} className="absolute top-3 right-3" />
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-base font-semibold leading-snug text-ink line-clamp-2">
          <Link to={`/blog/${_id}`} className="hover:text-tealink transition-colors">
            {title}
          </Link>
        </h3>

        <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2">
          {excerpt(description, 110)}
        </p>

        <div className="mt-auto pt-4 border-t border-line flex items-center justify-between gap-3">
          {/* No year here: the Bengali month name is wider and the full date
              would truncate in this column. The article page shows it in full. */}
          <AuthorChip author={author} subtitle={Moment(createdAt).format('MMM D')} />

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-xs text-muted" title={t('common.readTimeHint', { n: minutes })}>
              <ClockIcon className="w-3.5 h-3.5" />
              {t('common.min', { n: minutes })}
            </span>
            <LikeButton blogId={_id} count={likesCount || 0} size="sm" />
          </div>
        </div>
      </div>
    </article>
  )
}

export default BlogCard
