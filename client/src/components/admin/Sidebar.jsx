import { NavLink } from 'react-router-dom'
import { ChartIcon, CommentIcon, ListIcon, PlusIcon } from '../Icons'

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: ChartIcon },
  { to: '/admin/addBlog', label: 'Add blog', icon: PlusIcon },
  { to: '/admin/listBlog', label: 'Blog list', icon: ListIcon },
  { to: '/admin/comments', label: 'Comments', icon: CommentIcon },
]

const Sidebar = () => (
  <nav aria-label="Admin sections" className="border-r border-line bg-surface shrink-0">
    <ul className="pt-4 md:w-60">
      {links.map(({ to, end, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 md:px-6 py-3 text-sm transition-colors border-r-2 ${
                isActive
                  ? 'bg-tealsoft text-tealink border-tealsolid font-medium'
                  : 'text-muted border-transparent hover:text-ink hover:bg-raised/60'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="hidden md:inline">{label}</span>
            <span className="sr-only md:hidden">{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
)

export default Sidebar
