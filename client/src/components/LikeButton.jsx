import { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { HeartIcon } from './Icons'
import { compactNumber } from '../utils/format'

// Anyone can see the count; only a signed-in reader can change it.
const LikeButton = ({ blogId, count = 0, size = 'md', className = '' }) => {
  const { likedBlogs, toggleLike } = useAppContext()
  const [busy, setBusy] = useState(false)
  const [likes, setLikes] = useState(count)

  // Keep in step when the parent reloads the blog.
  useEffect(() => { setLikes(count) }, [count])

  const liked = likedBlogs.has(blogId)

  const onClick = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    const result = await toggleLike(blogId)
    if (result) setLikes(result.likes)
    setBusy(false)
  }

  const small = size === 'sm'

  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? `Unlike. ${likes} likes` : `Like. ${likes} likes`}
      title={liked ? 'Remove your like' : 'Like this article'}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors
        disabled:opacity-60 cursor-pointer
        ${small ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm font-medium'}
        ${liked ? 'border-tealsolid bg-tealsoft text-tealink' : 'border-line text-muted hover:text-tealink hover:border-tealsolid/50'}
        ${className}`}
    >
      <HeartIcon filled={liked} className={small ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'} />
      <span className="tabular-nums">{compactNumber(likes)}</span>
    </button>
  )
}

export default LikeButton
