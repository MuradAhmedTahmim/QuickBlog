import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { BookmarkIcon } from './Icons'

// Saving is optimistic in feel but the server stays authoritative: the context
// only records the new state once the request comes back.
const SaveButton = ({ blogId, variant = 'icon', className = '' }) => {
  const { bookmarkedBlogs, toggleBookmark } = useAppContext()
  const [busy, setBusy] = useState(false)

  const saved = bookmarkedBlogs.has(blogId)

  const onClick = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    await toggleBookmark(blogId)
    setBusy(false)
  }

  const label = saved ? 'Remove from saved' : 'Save for later'

  if (variant === 'full') {
    return (
      <button
        type="button" onClick={onClick} disabled={busy}
        aria-pressed={saved} title={label}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium
          transition-colors disabled:opacity-60 cursor-pointer
          ${saved ? 'border-tealsolid bg-tealsoft text-tealink' : 'border-line text-muted hover:text-tealink hover:border-tealsolid/50'}
          ${className}`}
      >
        <BookmarkIcon filled={saved} className="w-[18px] h-[18px]" />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      aria-label={label} aria-pressed={saved} title={label}
      className={`grid place-items-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors
        disabled:opacity-60 cursor-pointer
        ${saved ? 'bg-tealsolid text-onteal' : 'bg-surface/90 text-muted hover:text-tealink'} ${className}`}
    >
      <BookmarkIcon filled={saved} className="w-[17px] h-[17px]" />
    </button>
  )
}

export default SaveButton
