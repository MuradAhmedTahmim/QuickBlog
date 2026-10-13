import { MoonIcon, SunIcon } from './Icons'
import { useAppContext } from '../context/AppContext'

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useAppContext()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`grid place-items-center w-9 h-9 rounded-full border border-line text-muted
        hover:text-tealink hover:border-tealsolid/50 transition-colors cursor-pointer ${className}`}
    >
      {isDark ? <SunIcon className="w-[18px] h-[18px]" /> : <MoonIcon className="w-[18px] h-[18px]" />}
    </button>
  )
}

export default ThemeToggle
