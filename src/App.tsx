import { useRef, useState, type ReactNode } from 'react'
import {
  CITIES,
  SAO_PAULO,
  VANCOUVER,
  VANCOUVER_DST_END,
  convertWallTime,
  formatMeetingSummary,
  formatUtcOffset,
  getOffsetMinutes,
  isDstChangingOffsetGap,
  instantToWallTime,
  overlapHours,
  wallTimeToInstant,
  type CityId,
  type WallTime,
} from './lib/time'

const CITY_ORDER: readonly CityId[] = ['vancouver', 'saoPaulo']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDateInput(wall: WallTime): string {
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`
}

function toTimeInput(wall: WallTime): string {
  return `${pad(wall.hour)}:${pad(wall.minute)}`
}

function parseEntry(date: string, time: string): WallTime | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time)
  if (!dateMatch || !timeMatch) return null

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59) return null

  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day, hour, minute }
}

function formatCardDate(wall: WallTime): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(wall.year, wall.month - 1, wall.day)))
    .replace(',', '')
}

function hoursApart(instant: Date): number {
  return (
    (getOffsetMinutes(SAO_PAULO, instant) -
      getOffsetMinutes(VANCOUVER, instant)) /
    60
  )
}

function hourPhrase(hours: number): string {
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
  return `${rounded} ${Math.abs(hours) === 1 ? 'hour' : 'hours'}`
}

function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.append(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}

function describeOverlap(hours: number[]): string {
  if (hours.length === 0) return 'No shared working hours on this date.'

  const ranges: string[] = []
  let start = hours[0] ?? 0
  let end = start
  for (const hour of hours.slice(1)) {
    if (hour === end + 1) {
      end = hour
      continue
    }
    ranges.push(`${pad(start)}:00–${pad(end + 1)}:00`)
    start = hour
    end = hour
  }
  ranges.push(`${pad(start)}:00–${pad(end + 1)}:00`)
  return ranges.join(', ')
}

function App() {
  const [sourceCity, setSourceCity] = useState<CityId>('vancouver')
  const [when, setWhen] = useState(() => {
    const now = instantToWallTime(new Date(), VANCOUVER)
    return { date: toDateInput(now), time: toTimeInput(now) }
  })
  const { date, time } = when
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const source = CITIES[sourceCity]
  const target = CITIES[sourceCity === 'vancouver' ? 'saoPaulo' : 'vancouver']
  const wall = parseEntry(date, time)

  function clearCopyFeedback() {
    setCopied(false)
    setCopyError(false)
  }

  let body: ReactNode
  if (!wall) {
    body = <p role="alert">Enter a valid date and time.</p>
  } else {
    const converted = convertWallTime(wall, source.timeZone, target.timeZone)
    const instant = wallTimeToInstant(wall, source.timeZone)
    const summary = formatMeetingSummary(
      wall,
      source.label,
      converted,
      target.label,
    )
    const dstChangesGap = isDstChangingOffsetGap(instant, SAO_PAULO, VANCOUVER)
    const ahead = hoursApart(instant)
    const standardAhead = hoursApart(
      new Date(Date.UTC(wall.year, 0, 15, 18, 0, 0)),
    )
    const dstEnd = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(
      new Date(
        Date.UTC(
          VANCOUVER_DST_END.year,
          VANCOUVER_DST_END.month - 1,
          VANCOUVER_DST_END.day,
        ),
      ),
    )
    const slots = overlapHours(wall, source.timeZone, target.timeZone)
    const overlap = slots
      .filter((slot) => slot.overlap)
      .map((slot) => slot.hour)
    const overlapText = describeOverlap(overlap)

    function showCopied() {
      setCopied(true)
      setCopyError(false)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    }

    async function copySummary() {
      try {
        await navigator.clipboard.writeText(summary)
        showCopied()
      } catch {
        if (copyWithSelection(summary)) showCopied()
        else {
          setCopied(false)
          setCopyError(true)
        }
      }
    }

    body = (
      <>
        <section className="panel" aria-labelledby="equivalent-heading">
          <h2 id="equivalent-heading">Equivalent time</h2>
          <div className="pair">
            <article>
              <h3>{source.label}</h3>
              <p>
                {formatCardDate(wall)}, {toTimeInput(wall)}
              </p>
              <p className="offset">
                {formatUtcOffset(getOffsetMinutes(source.timeZone, instant))}
              </p>
            </article>
            <article>
              <h3>{target.label}</h3>
              <p>
                {formatCardDate(converted)}, {toTimeInput(converted)}
              </p>
              <p className="offset">
                {formatUtcOffset(getOffsetMinutes(target.timeZone, instant))}
              </p>
            </article>
          </div>
          <p className="summary">{summary}</p>
          <div className="copy-row">
            <button type="button" onClick={() => void copySummary()}>
              Copy
            </button>
            <p role="status" className="status">
              {copied
                ? 'Copied.'
                : copyError
                  ? 'Could not copy. Select the summary and copy it manually.'
                  : ''}
            </p>
          </div>
        </section>

        <section className="panel" aria-labelledby="offset-heading">
          <h2 id="offset-heading">UTC offsets at this time</h2>
          <ul className="offsets">
            <li>
              {source.label}{' '}
              <strong>
                {formatUtcOffset(getOffsetMinutes(source.timeZone, instant))}
              </strong>
            </li>
            <li>
              {target.label}{' '}
              <strong>
                {formatUtcOffset(getOffsetMinutes(target.timeZone, instant))}
              </strong>
            </li>
          </ul>
          <p>São Paulo is {hourPhrase(ahead)} ahead of Vancouver.</p>
          {dstChangesGap ? (
            <p className="flag" role="note">
              Daylight saving time changes the difference. São Paulo is{' '}
              {hourPhrase(ahead)} ahead instead of {hourPhrase(standardAhead)}.
              Pacific daylight time ends {dstEnd}; São Paulo does not observe
              daylight saving time.
            </p>
          ) : null}
        </section>

        <section className="panel" aria-labelledby="overlap-heading">
          <h2 id="overlap-heading">Working-hour overlap</h2>
          <p id="overlap-summary">
            Shared window in {source.label}: {overlapText}. Both cities use
            09:00–18:00 local.
          </p>
          <div className="strip-scroll">
            <ol className="strip" aria-describedby="overlap-summary">
              {slots.map((slot) => (
                <li
                  key={slot.hour}
                  className={slot.overlap ? 'slot overlap' : 'slot'}
                  aria-label={`${pad(slot.hour)}:00, ${slot.overlap ? 'both cities in working hours' : 'outside the shared window'}`}
                >
                  <span aria-hidden="true">{pad(slot.hour)}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="legend">
            <span className="swatch" aria-hidden="true" />
            Highlighted hours are inside 09:00–18:00 in both cities.
          </p>
        </section>
      </>
    )
  }

  return (
    <main>
      <header>
        <h1>tz-bridge</h1>
        <p className="lede">Plan a meeting between São Paulo and Vancouver.</p>
      </header>

      <section className="panel" aria-labelledby="entry-heading">
        <h2 id="entry-heading">Enter a time</h2>
        <fieldset className="cities">
          <legend>City for the date and time below</legend>
          {CITY_ORDER.map((id) => (
            <label key={id}>
              <input
                type="radio"
                name="source-city"
                value={id}
                checked={sourceCity === id}
                onChange={() => {
                  setSourceCity(id)
                  clearCopyFeedback()
                }}
              />
              {CITIES[id].label}
            </label>
          ))}
        </fieldset>
        <div className="fields">
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setWhen((current) => ({ ...current, date: event.target.value }))
                clearCopyFeedback()
              }}
            />
          </label>
          <label>
            Time
            <input
              type="time"
              step={60}
              value={time}
              onChange={(event) => {
                setWhen((current) => ({ ...current, time: event.target.value }))
                clearCopyFeedback()
              }}
            />
          </label>
        </div>
      </section>
      {body}
    </main>
  )
}

export default App
