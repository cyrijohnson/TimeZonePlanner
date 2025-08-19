import React, { useMemo, useRef, useState, useEffect } from 'react'

type TZItem = {
  id: string
  label: string   // Friendly name (can be city alias)
  tz: string      // IANA time zone
}

const DEFAULTS: TZItem[] = [
  { id: 'kolkata', label: 'Bengaluru / Kolkata', tz: 'Asia/Kolkata' },
  { id: 'stockholm', label: 'Stockholm', tz: 'Europe/Stockholm' },
  { id: 'newyork', label: 'New York', tz: 'America/New_York' },
]

// A tiny alias map so common Indian cities “just work”
const CITY_TO_TZ: Record<string, string> = {
  'bangalore': 'Asia/Kolkata',
  'bengaluru': 'Asia/Kolkata',
  'kolkata': 'Asia/Kolkata',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'ooty': 'Asia/Kolkata',
  'chennai': 'Asia/Kolkata',
  'stockholm': 'Europe/Stockholm',
  'sweden': 'Europe/Stockholm',
  'new york': 'America/New_York',
  'nyc': 'America/New_York',
  'london': 'Europe/London',
  'berlin': 'Europe/Berlin',
  'sydney': 'Australia/Sydney',
  'tokyo': 'Asia/Tokyo',
  'dubai': 'Asia/Dubai',
  'singapore': 'Asia/Singapore'
}

// Get all supported timezones from the browser (Chromium/Firefox/Edge)
const ALL_TZS: string[] = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : []

// Helpers
function fmtHour(d: Date, tz: string) {
  return d.toLocaleString([], { hour: 'numeric', hour12: true, timeZone: tz })
}

function offsetMinutes(tz: string, at: Date) {
  // returns offset in minutes from UTC for given tz at the date/time
  const local = new Date(at.toLocaleString('en-US', { timeZone: tz }))
  return Math.round((local.getTime() - at.getTime()) / (60 * 1000))
}

function minutesToOffsetStr(mins: number) {
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60).toString().padStart(2, '0')
  const m = Math.abs(abs % 60).toString().padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

function hoursArray() { return Array.from({ length: 24 }, (_, i) => i) }

function toUTCStartOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
}

function initialItems(): TZItem[] {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('tz-items')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) return parsed
      } catch {
        /* ignore */
      }
    }
  }
  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone
  const localItem: TZItem = {
    id: 'local',
    label: `Your Time (${userTZ.replace(/_/g, ' ')})`,
    tz: userTZ,
  }
  const rest = DEFAULTS.filter(i => i.tz !== userTZ)
  return [localItem, ...rest]
}

export default function App() {
  const [items, setItems] = useState<TZItem[]>(initialItems)
  const [input, setInput] = useState('')
  const [workStart, setWorkStart] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('workStart')
      if (v !== null) return parseInt(v)
    }
    return 9
  })
  const [workEnd, setWorkEnd] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('workEnd')
      if (v !== null) return parseInt(v)
    }
    return 17
  })
  const gridRef = useRef<HTMLDivElement | null>(null)

  const utcStart = useMemo(() => toUTCStartOfToday(), [])
  const now = new Date()
  const minutesSinceStartUTC = (now.getUTCHours() * 60) + now.getUTCMinutes()
  const nowPercent = (minutesSinceStartUTC / (24 * 60)) * 100

  const timezonesForDatalist = useMemo(() => {
    return ALL_TZS.length ? ALL_TZS : [
      'Asia/Kolkata', 'Europe/Stockholm', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'
    ]
  }, [])

  function addLocation(raw: string) {
    const val = raw.trim()
    if (!val) return
    let tz = val
    // If user typed a city/alias, map it; otherwise accept as IANA tz if valid-like
    const alias = CITY_TO_TZ[val.toLowerCase()]
    if (alias) tz = alias

    // simple validation: looks like Continent/City
    if (!tz.includes('/')) {
      alert('Please enter a valid IANA time zone (e.g., Europe/Stockholm) or a known city like “Bengaluru”.')
      return
    }
    const id = tz.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const label = alias ? raw : tz
    if (items.some(i => i.tz === tz)) {
      setInput('')
      return
    }
    setItems(prev => [...prev, { id, label, tz }])
    setInput('')
  }

  function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function move(id: string, dir: -1 | 1) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = Math.max(0, Math.min(prev.length - 1, idx + dir))
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tz-items', JSON.stringify(items))
    }
  }, [items])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('workStart', workStart.toString())
    }
  }, [workStart])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('workEnd', workEnd.toString())
    }
  }, [workEnd])

  // Keyboard: Enter to add
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addLocation(input)
  }

  // Ensure the grid scrolls to keep the “now” marker visible on mount
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const containerWidth = el.clientWidth
    const targetX = (nowPercent / 100) * el.scrollWidth - containerWidth / 2
    el.scrollLeft = Math.max(0, targetX)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h1>Timezone Planner</h1>
          <p className="tagline">Compare timelines across cities and time zones.</p>
        </div>

        <div className="inputs">
          <input
            list="tzlist"
            placeholder="Add a city or IANA time zone (e.g., Bengaluru or Europe/Stockholm)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ minWidth: 340 }}
            autoFocus
          />
          <datalist id="tzlist">
            {timezonesForDatalist.map(z => <option key={z} value={z} />)}
            {Object.keys(CITY_TO_TZ).map(c => <option key={c} value={c} />)}
          </datalist>
          <button className="primary" onClick={() => addLocation(input)}>Add</button>

          <span className="small" style={{ marginLeft: 'auto' }}>Working hours highlight</span>
          <select value={workStart} onChange={e => setWorkStart(parseInt(e.target.value))}>
            {hoursArray().map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>)}
          </select>
          <span>to</span>
          <select value={workEnd} onChange={e => setWorkEnd(parseInt(e.target.value))}>
            {hoursArray().map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>)}
          </select>
        </div>

        <div className="inputs" style={{ gap: 12 }}>
          {items.map(i => (
            <span className="tag" key={i.id}>
              {i.label}
              <button title="Move up" onClick={() => move(i.id, -1)}>↑</button>
              <button title="Move down" onClick={() => move(i.id, 1)}>↓</button>
              <button title="Remove" onClick={() => remove(i.id)}>✕</button>
            </span>
          ))}
        </div>

        <hr className="sep" />

        <div className="grid" ref={gridRef}>
          <div className="grid-inner">
            {/* Hour header row (UTC) */}
            <div className="row">
              <div className="row-left">
                <div className="row-title">UTC</div>
                <div className="offset">Reference</div>
              </div>
              <div className="row-right">
                <div className="hours">
                  {hoursArray().map(h => (
                    <div className="hour-cell" key={h}>{h.toString().padStart(2, '0')}:00</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Time zone rows */}
            {items.map(item => {
              const offMins = offsetMinutes(item.tz, now)
              const offsetStr = minutesToOffsetStr(offMins)
              return (
                <div className="row" key={item.id}>
                  <div className="row-left">
                    <div className="row-title">{item.label}</div>
                    <div className="offset">
                      {offsetStr} • Now: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: item.tz })}
                    </div>
                  </div>
                  <div className="row-right">
                    <div className="timeline">
                      {hoursArray().map(h => {
                        const utcHour = new Date(utcStart.getTime() + h * 60 * 60 * 1000)
                        const display = fmtHour(utcHour, item.tz)
                        // Get the hour number in the local tz (0-23) to highlight working hours
                        const localHour = parseInt(utcHour.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: item.tz }))
                        const isWorking = (workStart <= workEnd)
                          ? (localHour >= workStart && localHour < workEnd)
                          : (localHour >= workStart || localHour < workEnd) // overnight shift
                        return (
                          <div className={'cell' + (isWorking ? ' working' : '')} key={h} title={`UTC ${h.toString().padStart(2,'0')}:00 → ${display}`}>
                            {display}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Now marker (relative to UTC start of day) */}
            <div className="now-marker" style={{ left: `${nowPercent}%` }} />
          </div>
        </div>

        <div className="legend">
          <div className="swatch" /> Working hours
          <span>•</span>
          <span>Yellow line = current time</span>
        </div>

        <div className="footer">
          <p>
            <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a>
          </p>
        </div>

      </div>
    </div>
  )
}
