import { Link } from 'react-router-dom'
import { Wordmark } from './Icons'
import { blogCategories } from '../assets/assets'

const Footer = () => (
  <footer className="mt-20 bg-navy text-onnavy">
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
      <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link to="/" className="text-onnavy inline-block">
            <Wordmark className="text-base" />
          </Link>
          <p className="mt-4 max-w-sm text-sm text-onnavy/65 leading-relaxed">
            A quiet corner of the internet for long-form thinking on technology,
            startups, lifestyle and finance.
          </p>
        </div>

        <nav aria-labelledby="footer-topics">
          <h3 id="footer-topics" className="text-sm font-semibold mb-4">Topics</h3>
          <ul className="space-y-2.5 text-sm text-onnavy/65">
            {blogCategories.filter((category) => category !== 'All').map((category) => (
              <li key={category}>
                <Link to="/" className="hover:text-teal transition-colors">{category}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-site">
          <h3 id="footer-site" className="text-sm font-semibold mb-4">Site</h3>
          <ul className="space-y-2.5 text-sm text-onnavy/65">
            <li><Link to="/" className="hover:text-teal transition-colors">Home</Link></li>
            <li><Link to="/saved" className="hover:text-teal transition-colors">Saved articles</Link></li>
            <li><Link to="/admin" className="hover:text-teal transition-colors">Admin</Link></li>
          </ul>
        </nav>
      </div>

      <div className="mt-12 pt-6 border-t border-onnavy/15 text-sm text-onnavy/55">
        &copy; {new Date().getFullYear()} QuickBlog. All rights reserved.
      </div>
    </div>
  </footer>
)

export default Footer
