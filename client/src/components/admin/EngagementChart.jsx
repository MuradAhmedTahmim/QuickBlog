import { useMemo, useState } from 'react'
import Moment from 'moment'

// Three series over fourteen days. Colours are the validated categorical slots
// from the theme (--qb-series-*), re-stepped per mode in index.css.
const SERIES = [
  { key: 'uniqueViews', label: 'Unique readers', color: 'var(--qb-series-1)' },
  { key: 'likes',       label: 'Likes',          color: 'var(--qb-series-2)' },
  { key: 'comments',    label: 'Comments',       color: 'var(--qb-series-3)' },
]

const WIDTH = 720
const HEIGHT = 240
const PAD = { top: 16, right: 56, bottom: 30, left: 36 }

const EngagementChart = ({ series }) => {
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)

  const days = series?.days || []

  const { points, max, plotHeight, stepX } = useMemo(() => {
    const plotWidth = WIDTH - PAD.left - PAD.right
    const plotHeight = HEIGHT - PAD.top - PAD.bottom

    const values = SERIES.flatMap(({ key }) => series?.[key] || [])
    // Rounded up to a multiple of 3 so the four gridlines land on whole
    // numbers; a flat zero line still needs a sensible scale to sit on.
    const peak = Math.max(3, ...values)
    const max = Math.ceil(peak / 3) * 3
    const stepX = days.length > 1 ? plotWidth / (days.length - 1) : 0

    const points = Object.fromEntries(SERIES.map(({ key }) => [
      key,
      (series?.[key] || []).map((value, index) => ({
        x: PAD.left + index * stepX,
        y: PAD.top + plotHeight - (value / max) * plotHeight,
        value,
      })),
    ]))

    return { points, max, plotWidth, plotHeight, stepX }
  }, [series, days.length])

  const total = useMemo(
    () => SERIES.reduce((sum, { key }) => sum + (series?.[key] || []).reduce((a, b) => a + b, 0), 0),
    [series]
  )

  if (!days.length) return null

  // Four hairline gridlines, labelled on the y-axis.
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = Math.round((max / 3) * index)
    return { value, y: PAD.top + plotHeight - (value / max) * plotHeight }
  })

  const onMove = (event) => {
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH
    const index = Math.round((x - PAD.left) / (stepX || 1))
    setHover(index >= 0 && index < days.length ? index : null)
  }

  return (
    <section className="qb-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Engagement, last 14 days</h2>
          <p className="mt-0.5 text-xs text-muted">
            {total === 0 ? 'No activity recorded yet in this window' : 'New unique readers, likes and comments per day'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          className="px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-tealink hover:border-tealsolid/50 transition-colors cursor-pointer"
        >
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {/* Legend - identity never rests on colour alone. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {SERIES.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            {label}
          </li>
        ))}
      </ul>

      {asTable ? (
        <div className="mt-4 overflow-x-auto qb-scroll-x">
          <table className="w-full text-sm">
            <caption className="sr-only">Daily engagement for the last 14 days</caption>
            <thead>
              <tr className="text-xs text-muted text-left border-b border-line">
                <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                {SERIES.map(({ key, label }) => (
                  <th key={key} scope="col" className="py-2 pr-4 font-medium text-right">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, index) => (
                <tr key={day} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-2 pr-4 font-normal text-muted whitespace-nowrap">
                    {Moment(day).format('MMM D')}
                  </th>
                  {SERIES.map(({ key }) => (
                    <td key={key} className="py-2 pr-4 text-right tabular-nums text-ink">
                      {series[key]?.[index] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Line chart of unique readers, likes and comments per day over the last 14 days. ${total} events in total.`}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            {/* Gridlines: solid hairlines, one step off the surface. */}
            {ticks.map(({ value, y }) => (
              <g key={value}>
                <line
                  x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y}
                  stroke="var(--qb-line)" strokeWidth="1"
                />
                <text
                  x={PAD.left - 8} y={y + 4} textAnchor="end"
                  className="tabular-nums" fontSize="10" fill="var(--qb-muted)"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* X labels: every third day, so they never collide. */}
            {days.map((day, index) => (
              index % 3 === 0 || index === days.length - 1 ? (
                <text
                  key={day}
                  x={PAD.left + index * stepX} y={HEIGHT - 10}
                  textAnchor="middle" fontSize="10" fill="var(--qb-muted)"
                >
                  {Moment(day).format('MMM D')}
                </text>
              ) : null
            ))}

            {hover !== null && (
              <line
                x1={PAD.left + hover * stepX} x2={PAD.left + hover * stepX}
                y1={PAD.top} y2={PAD.top + plotHeight}
                stroke="var(--qb-muted)" strokeWidth="1" opacity="0.4"
              />
            )}

            {SERIES.map(({ key, color }) => {
              const line = points[key]
              if (!line?.length) return null
              const d = line.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')
              const last = line[line.length - 1]

              return (
                <g key={key}>
                  <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                  {/* End marker with a surface ring, so overlaps stay readable. */}
                  <circle cx={last.x} cy={last.y} r="4.5" fill={color} stroke="var(--qb-surface)" strokeWidth="2" />

                  {/* Selective direct label: the latest value only. */}
                  <text
                    x={last.x + 10} y={last.y + 4}
                    fontSize="11" fontWeight="600" fill={color} className="tabular-nums"
                  >
                    {last.value}
                  </text>

                  {hover !== null && line[hover] && (
                    <circle
                      cx={line[hover].x} cy={line[hover].y} r="5"
                      fill={color} stroke="var(--qb-surface)" strokeWidth="2"
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 px-3 py-2 rounded-lg qb-card qb-shadow-lg text-xs"
              style={{
                left: `${((PAD.left + hover * stepX) / WIDTH) * 100}%`,
                transform: `translateX(${hover > days.length / 2 ? '-110%' : '12px'})`,
              }}
            >
              <p className="font-medium text-ink whitespace-nowrap">{Moment(days[hover]).format('MMM D, YYYY')}</p>
              <ul className="mt-1.5 space-y-1">
                {SERIES.map(({ key, label, color }) => (
                  <li key={key} className="flex items-center gap-2 whitespace-nowrap text-muted">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    {label}
                    <span className="ml-auto pl-3 tabular-nums font-medium text-ink">
                      {series[key]?.[hover] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default EngagementChart
