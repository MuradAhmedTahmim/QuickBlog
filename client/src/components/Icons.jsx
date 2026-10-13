// A single stroke-based icon set drawn with currentColor, so every icon follows
// the theme. The bundled PNG/SVG assets had the old purple baked in and could
// not be recoloured.

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

const Icon = ({ children, className = 'w-5 h-5', ...rest }) => (
  <svg {...base} className={className} {...rest}>{children}</svg>
)

export const SearchIcon = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
)

export const CloseIcon = (p) => (
  <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>
)

export const SunIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (p) => (
  <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Icon>
)

export const BookmarkIcon = ({ filled = false, ...p }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Icon>
)

export const HeartIcon = ({ filled = false, ...p }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M20.1 5.6a5 5 0 0 0-7.1 0l-1 1-1-1a5 5 0 1 0-7.1 7.1l8.1 8.1 8.1-8.1a5 5 0 0 0 0-7.1Z" />
  </Icon>
)

export const ClockIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
)

export const EyeIcon = (p) => (
  <Icon {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></Icon>
)

export const CommentIcon = (p) => (
  <Icon {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.4-.6L3 21l1.7-5a8.1 8.1 0 0 1-.7-3.4 8.4 8.4 0 0 1 8.5-8.1 8.4 8.4 0 0 1 8.5 7.5Z" /></Icon>
)

export const TrendingIcon = (p) => (
  <Icon {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></Icon>
)

export const ArrowRightIcon = (p) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
)

export const ArrowLeftIcon = (p) => (
  <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Icon>
)

export const UserIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>
)

export const LogOutIcon = (p) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Icon>
)

export const HomeIcon = (p) => (
  <Icon {...p}><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 21v-7h6v7" /></Icon>
)

export const PlusIcon = (p) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
)

export const ListIcon = (p) => (
  <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Icon>
)

export const TrashIcon = (p) => (
  <Icon {...p}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" /></Icon>
)

export const EditIcon = (p) => (
  <Icon {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 6.5 3 3" /></Icon>
)

export const CheckIcon = (p) => (
  <Icon {...p}><path d="m5 13 4 4L19 7" /></Icon>
)

export const SparkleIcon = (p) => (
  <Icon {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" /></Icon>
)

export const ImageIcon = (p) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 17 5-4.5 4.5 4 3-2.5L20 17" /></Icon>
)

export const MenuIcon = (p) => (
  <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
)

export const MailIcon = (p) => (
  <Icon {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>
)

export const ChartIcon = (p) => (
  <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>
)

export const DraftIcon = (p) => (
  <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></Icon>
)

// The wordmark. The dot is the teal accent, everything else inherits ink.
export const Wordmark = ({ className = 'h-7' }) => (
  <span className={`inline-flex items-baseline gap-[0.1em] font-semibold tracking-tight ${className}`}>
    <span className="text-[1.35em] leading-none">Quick</span>
    <span className="text-[1.35em] leading-none text-tealink">Blog</span>
    <span className="w-[0.28em] h-[0.28em] rounded-full bg-tealsolid translate-y-[-0.05em]" />
  </span>
)

export default Icon
