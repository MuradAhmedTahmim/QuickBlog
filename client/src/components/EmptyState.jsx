const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    {Icon && (
      <div className="grid place-items-center w-14 h-14 rounded-full bg-tealsoft text-tealink mb-4">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-ink">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export default EmptyState
