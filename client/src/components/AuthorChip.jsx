import { Link } from 'react-router-dom'
import { initials } from '../utils/format'

// Falls back to initials whenever an author has no picture.
const AuthorChip = ({ author, size = 'sm', link = true, subtitle }) => {
  if (!author) return null

  const dimension = size === 'lg' ? 'w-11 h-11 text-sm' : 'w-7 h-7 text-[11px]'

  const avatar = author.image
    ? <img src={author.image} alt="" className={`${dimension} rounded-full object-cover shrink-0`} />
    : (
      <span className={`${dimension} rounded-full bg-navysoft text-tealink grid place-items-center font-semibold shrink-0`}>
        {initials(author.name)}
      </span>
    )

  const body = (
    <span className="flex items-center gap-2 min-w-0">
      {avatar}
      <span className="min-w-0">
        <span className={`block truncate font-medium ${size === 'lg' ? 'text-sm text-ink' : 'text-xs text-ink'}`}>
          {author.name}
        </span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
    </span>
  )

  if (!link || !author._id) return body

  return (
    <Link
      to={`/author/${author._id}`}
      onClick={(event) => event.stopPropagation()}
      className="hover:text-tealink transition-colors min-w-0"
    >
      {body}
    </Link>
  )
}

export default AuthorChip
