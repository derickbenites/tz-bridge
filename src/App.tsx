import { useRef, useState, type ReactNode } from 'react'
import {
  convertWallTime,
  defaultOtherTimeZone,
  describeOffsetGap,
  formatMeetingSummary,
  formatTimeZoneName,
  formatUtcOffset,
  getLocalTimeZone,
  getOffsetMinutes,
  groupTimeZones,
  instantToWallTime,
  isDstChangingOffsetGap,
  januaryReferenceInstant,
  listTimeZones,
  offsetGapHours,
  overlapHours,
  wallTimeToInstant,
  type WallTime,
} from './lib/time'

type EntrySide = 'local' | 'other'

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
  const [localZone] = useState(getLocalTimeZone)
  const [otherZone, setOtherZone] = useState(() =>
    defaultOtherTimeZone(getLocalTimeZone()),
  )
  const [entrySide, setEntrySide] = useState<EntrySide>('local')
  const [zoneGroups] = useState(() => groupTimeZones(listTimeZones()))
  const [when, setWhen] = useState(() => {
    const now = instantToWallTime(new Date(), getLocalTimeZone())
    return { date: toDateInput(now), time: toTimeInput(now) }
  })
  const { date, time } = when
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const localLabel = formatTimeZoneName(localZone)
  const otherLabel = formatTimeZoneName(otherZone)
  const sourceZone = entrySide === 'local' ? localZone : otherZone
  const targetZone = entrySide === 'local' ? otherZone : localZone
  const sourceLabel = entrySide === 'local' ? localLabel : otherLabel
  const targetLabel = entrySide === 'local' ? otherLabel : localLabel
  const wall = parseEntry(date, time)

  function clearCopyFeedback() {
    setCopied(false)
    setCopyError(false)
  }

  let body: ReactNode
  if (!wall) {
    body = <p role="alert">Enter a valid date and time.</p>
  } else {
    const converted = convertWallTime(wall, sourceZone, targetZone)
    const instant = wallTimeToInstant(wall, sourceZone)
    const summary = formatMeetingSummary(
      wall,
      sourceLabel,
      converted,
      targetLabel,
    )
    const dstChangesGap = isDstChangingOffsetGap(instant, localZone, otherZone)
    const ahead = describeOffsetGap(
      offsetGapHours(instant, localZone, otherZone),
    )
    const standardAhead = describeOffsetGap(
      offsetGapHours(januaryReferenceInstant(instant), localZone, otherZone),
    )
    const slots = overlapHours(wall, sourceZone, targetZone)
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
              <h3>{sourceLabel}</h3>
              <p className="zone-id">{sourceZone}</p>
              <p>
                {formatCardDate(wall)}, {toTimeInput(wall)}
              </p>
              <p className="offset">
                {formatUtcOffset(getOffsetMinutes(sourceZone, instant))}
              </p>
            </article>
            <article>
              <h3>{targetLabel}</h3>
              <p className="zone-id">{targetZone}</p>
              <p>
                {formatCardDate(converted)}, {toTimeInput(converted)}
              </p>
              <p className="offset">
                {formatUtcOffset(getOffsetMinutes(targetZone, instant))}
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
              {localLabel}{' '}
              <strong>
                {formatUtcOffset(getOffsetMinutes(localZone, instant))}
              </strong>
            </li>
            <li>
              {otherLabel}{' '}
              <strong>
                {formatUtcOffset(getOffsetMinutes(otherZone, instant))}
              </strong>
            </li>
          </ul>
          <p>
            {localLabel} is {ahead} {otherLabel}.
          </p>
          {dstChangesGap ? (
            <p className="flag" role="note">
              Daylight saving time changes the difference. {localLabel} is{' '}
              {ahead} {otherLabel} instead of {standardAhead} {otherLabel} in
              January.
            </p>
          ) : null}
        </section>

        <section className="panel" aria-labelledby="overlap-heading">
          <h2 id="overlap-heading">Working-hour overlap</h2>
          <p id="overlap-summary">
            Shared window in {sourceLabel}: {overlapText}. Both zones use
            09:00–18:00 local.
          </p>
          <div className="strip-scroll">
            <ol className="strip" aria-describedby="overlap-summary">
              {slots.map((slot) => (
                <li
                  key={slot.hour}
                  className={slot.overlap ? 'slot overlap' : 'slot'}
                  aria-label={`${pad(slot.hour)}:00, ${slot.overlap ? 'both zones in working hours' : 'outside the shared window'}`}
                >
                  <span aria-hidden="true">{pad(slot.hour)}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="legend">
            <span className="swatch" aria-hidden="true" />
            Highlighted hours are inside 09:00–18:00 in both zones.
          </p>
        </section>
      </>
    )
  }

  return (
    <main>
      <header>
        <h1>tz-bridge</h1>
        <p className="lede">
          Plan a meeting between your time zone and another one.
        </p>
      </header>

      <section className="panel" aria-labelledby="entry-heading">
        <h2 id="entry-heading">Enter a time</h2>
        <div className="here">
          <p className="here-label">Your time zone</p>
          <p className="here-name">{localLabel}</p>
          <p className="zone-id">{localZone}</p>
        </div>
        <label className="compare">
          Compare with
          <select
            value={otherZone}
            onChange={(event) => {
              setOtherZone(event.target.value)
              clearCopyFeedback()
            }}
          >
            {zoneGroups.map((group) => {
              const timeZones = group.timeZones.filter(
                (timeZone) => timeZone !== localZone,
              )
              if (timeZones.length === 0) return null
              return (
                <optgroup key={group.region} label={group.region}>
                  {timeZones.map((timeZone) => (
                    <option key={timeZone} value={timeZone}>
                      {formatTimeZoneName(timeZone)}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </label>
        <fieldset className="cities">
          <legend>Enter the date and time in</legend>
          <label>
            <input
              type="radio"
              name="entry-side"
              value="local"
              checked={entrySide === 'local'}
              onChange={() => {
                setEntrySide('local')
                clearCopyFeedback()
              }}
            />
            {localLabel}
          </label>
          <label>
            <input
              type="radio"
              name="entry-side"
              value="other"
              checked={entrySide === 'other'}
              onChange={() => {
                setEntrySide('other')
                clearCopyFeedback()
              }}
            />
            {otherLabel}
          </label>
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
