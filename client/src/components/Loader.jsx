import { useAppContext } from '../context/AppContext'

const Loader = ({ label, full = true }) => {
  const { t } = useAppContext()

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${full ? 'min-h-[60vh]' : 'py-16'}`}
    >
      <span className="w-9 h-9 rounded-full border-2 border-line border-t-tealsolid animate-spin" />
      <span className="text-sm text-muted">{label || t('common.loading')}</span>
    </div>
  )
}

export default Loader
