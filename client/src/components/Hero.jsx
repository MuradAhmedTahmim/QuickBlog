import { useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { CloseIcon, SearchIcon } from './Icons'

const Hero = () => {
  const { setInput, input } = useAppContext()
  const inputRef = useRef(null)

  // Keep the field in step when the search is cleared from elsewhere.
  useEffect(() => {
    if (inputRef.current && input === '') inputRef.current.value = ''
  }, [input])

  const onSubmit = (event) => {
    event.preventDefault()
    setInput(inputRef.current.value.trim())
  }

  return (
    <section className="relative overflow-hidden bg-navy text-onnavy">
      {/* A soft teal wash gives the band depth without a loud gradient. */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-teal/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-20 w-[22rem] h-[22rem] rounded-full bg-teal/10 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-onnavy/20 bg-onnavy/5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
          Written by humans, drafted with AI
        </span>

        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08]">
          Ideas worth
          <span className="block text-teal">slowing down for.</span>
        </h1>

        <p className="mt-5 mx-auto max-w-xl text-base sm:text-lg text-onnavy/70 leading-relaxed">
          Essays and field notes on technology, startups, lifestyle and finance &mdash;
          no filler, no clickbait, just the thinking behind the work.
        </p>

        <form onSubmit={onSubmit} role="search" className="mt-9 mx-auto max-w-lg">
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-surface border border-line">
            <SearchIcon className="w-5 h-5 ml-3 text-muted shrink-0" />
            <input
              id="blog-search" ref={inputRef} type="search"
              placeholder="Search articles and topics"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-muted/80 outline-none text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-tealsolid text-onteal text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {input && (
          <button
            type="button"
            onClick={() => setInput('')}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-onnavy/25 text-xs hover:bg-onnavy/10 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-3.5 h-3.5" />
            Clear &ldquo;{input}&rdquo;
          </button>
        )}
      </div>
    </section>
  )
}

export default Hero
