import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import BlogList from '../components/BlogList'
import FeaturedBlog from '../components/FeaturedBlog'
import TrendingList from '../components/TrendingList'
import Newsletter from '../components/Newsletter'
import Footer from '../components/Footer'
import { useAppContext } from '../context/AppContext'

const Home = () => {
  const { blogs, blogsLoading, input } = useAppContext()

  // The newest post leads the page; it is dropped from the grid below so the
  // same article never appears twice. A search replaces the lead entirely.
  const featured = !input && !blogsLoading ? blogs[0] : null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Hero />

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-14 sm:py-16">
        {featured && (
          <div className="mb-14">
            <FeaturedBlog blog={featured} />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_20rem] gap-10 items-start">
          <BlogList />

          <div className="lg:sticky lg:top-24">
            <TrendingList />
          </div>
        </div>

        <div className="mt-16">
          <Newsletter />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Home
