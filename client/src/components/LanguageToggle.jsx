import { useAppContext } from '../context/AppContext'

// Shows the language you would switch *to*, written in that language, so the
// label is readable to whoever needs it.
const LanguageToggle = ({ className = '' }) => {
  const { language, toggleLanguage, t } = useAppContext()
  const label = t('language.switchTo')

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={label}
      title={label}
      className={`h-9 px-2.5 rounded-full border border-line text-muted text-xs font-medium
        hover:text-tealink hover:border-tealsolid/50 transition-colors cursor-pointer
        whitespace-nowrap ${className}`}
    >
      {language === 'bn' ? 'EN' : 'বাং'}
    </button>
  )
}

export default LanguageToggle
