import { useEffect, useMemo, useState } from 'react'
import { blogCategories } from '../assets/assets'
import BlogCard from './BlogCard'
import EmptyState from './EmptyState'
import { SearchIcon } from './Icons'
import { useAppContext } from '../context/AppContext'

// Identical to the animated pill, so swapping one for the other is invisible.
const StaticPill = () => <span className="absolute inset-0 -z-10 rounded-full bg-tealsolid" />

// Fetches the animated pill once the browser is idle, which keeps the motion
// library off the critical path while still having it ready before anyone
// clicks a category.
const useAnimatedPill = () => {
  const [Pill, setPill] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () => import('./CategoryPill').then((module) => {
      if (!cancelled) setPill(() => module.default)
    })

    const idle = window.requestIdleCallback
    const handle = idle ? idle(load, { timeout: 2000 }) : setTimeout(load, 1200)

    return () => {
      cancelled = true
      idle ? window.cancelIdleCallback?.(handle) : clearTimeout(handle)
    }
  }, [])

  return Pill
}

const CardSkeleton = () => (
  <div className="qb-card overflow-hidden animate-pulse">
    <div className="w-full aspect-[16/10] bg-raised" />
    <div className="p-5 space-y-3">
      <div className="h-4 w-3/4 rounded bg-raised" />
      <div className="h-3 w-full rounded bg-raised" />
      <div className="h-3 w-2/3 rounded bg-raised" />
    </div>
  </div>
)

const BlogList = () => {
  const [menu, setMenu] = useState("All")
  const AnimatedPill = useAnimatedPill()
  const { blogs, blogsLoading, input, setInput } = useAppContext()

  // Search covers the title, subtitle and category so a topic word still finds it.
  const results = useMemo(() => {
    const term = input.trim().toLowerCase()
    const searched = !term ? blogs : blogs.filter((blog) =>
      blog.title?.toLowerCase().includes(term) ||
      blog.subTitle?.toLowerCase().includes(term) ||
      blog.category?.toLowerCase().includes(term)
    )
    return menu === 'All' ? searched : searched.filter((blog) => blog.category === menu)
  }, [blogs, input, menu])

  const counts = useMemo(() => {
    const map = { All: blogs.length }
    for (const blog of blogs) map[blog.category] = (map[blog.category] || 0) + 1
    return map
  }, [blogs])

  return (
    <section aria-labelledby="articles-heading" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="articles-heading" className="text-xl font-semibold tracking-tight text-ink">
            {input ? `Results for "${input}"` : menu === 'All' ? 'Latest articles' : menu}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {blogsLoading ? 'Loading articles...' : `${results.length} article${results.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      {/* Category filter. One row, above everything it scopes. */}
      <div className="qb-scroll-x -mx-1 px-1 mb-7 overflow-x-auto">
        <div role="tablist" aria-label="Filter by category" className="flex gap-2 w-max">
          {blogCategories.map((item) => {
            const active = menu === item
            return (
              <button
                key={item} type="button" role="tab" aria-selected={active}
                onClick={() => setMenu(item)}
                className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer
                  ${active ? 'text-onteal' : 'text-muted hover:text-ink border border-line'}`}
              >
                {active && (AnimatedPill ? <AnimatedPill /> : <StaticPill />)}
                {item}
                {counts[item] > 0 && (
                  <span className={`ml-1.5 text-xs tabular-nums ${active ? 'text-onteal/70' : 'text-muted/70'}`}>
                    {counts[item]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {blogsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="qb-card">
          <EmptyState
            icon={SearchIcon}
            title={input ? 'No articles match that search' : 'Nothing here yet'}
            description={input
              ? 'Try a different word, or browse another category.'
              : 'Once articles are published in this category they will appear here.'}
            action={input && (
              <button
                type="button"
                onClick={() => { setInput(''); setMenu('All') }}
                className="px-5 py-2.5 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Clear search
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((blog) => <BlogCard key={blog._id} blog={blog} />)}
        </div>
      )}
    </section>
  )
}

export default BlogList
