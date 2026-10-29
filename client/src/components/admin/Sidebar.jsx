import { NavLink } from 'react-router-dom'
import { ChartIcon, CommentIcon, ListIcon, PlusIcon } from '../Icons'
import { useAppContext } from '../../context/AppContext'

const links = [
  { to: '/admin', end: true, labelKey: 'admin.navDashboard', icon: ChartIcon },
  { to: '/admin/addBlog', labelKey: 'admin.navAdd', icon: PlusIcon },
  { to: '/admin/listBlog', labelKey: 'admin.navList', icon: ListIcon },
  // Moderation is admin-only on the server, so authors never see the link.
  { to: '/admin/comments', labelKey: 'admin.navComments', icon: CommentIcon, adminOnly: true },
]

const Sidebar = () => {
  const { t, isAdmin } = useAppContext()
  const visible = links.filter((link) => !link.adminOnly || isAdmin)

  return (
    <nav aria-label={t('admin.sections')} className="border-r border-line bg-surface shrink-0">
      <ul className="pt-4 md:w-60">
        {visible.map(({ to, end, labelKey, icon: Icon }) => (
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
              <span className="hidden md:inline">{t(labelKey)}</span>
              <span className="sr-only md:hidden">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
