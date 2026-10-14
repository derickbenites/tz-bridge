/**
 * Time-zone helpers built on Intl. Working hours are the local interval
 * [09:00, 18:00). Vancouver observes Pacific daylight time; São Paulo does not.
 */

export const SAO_PAULO = 'America/Sao_Paulo'
export const VANCOUVER = 'America/Vancouver'

export const WORK_START_HOUR = 9
export const WORK_END_HOUR = 18

/** Civil date when Pacific daylight time ends in 2026 (02:00 rolls back to 01:00). */
export const VANCOUVER_DST_END = { year: 2026, month: 11, day: 1 } as const

export type CityId = 'vancouver' | 'saoPaulo'

export const CITIES: Record<
  CityId,
  { id: CityId; timeZone: string; label: string }
> = {
  vancouver: { id: 'vancouver', timeZone: VANCOUVER, label: 'Vancouver' },
  saoPaulo: { id: 'saoPaulo', timeZone: SAO_PAULO, label: 'São Paulo' },
}

export type WallTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export type HourSlot = {
  hour: number
  overlap: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

type ZonedParts = WallTime & { second: number }

function readZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const found = parts.find((part) => part.type === type)
    if (!found) {
      throw new Error(`Intl did not return ${type} for ${timeZone}`)
    }
    return Number(found.value)
  }

  let year = value('year')
  let month = value('month')
  let day = value('day')
  let hour = value('hour')

  // A few engines report midnight as 24:00 on the same civil date.
  if (hour === 24) {
    hour = 0
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear()
    month = next.getUTCMonth() + 1
    day = next.getUTCDate()
  }

  return {
    year,
    month,
    day,
    hour,
    minute: value('minute'),
    second: value('second'),
  }
}

/** Minutes east of UTC. São Paulo is -180. */
export function getOffsetMinutes(timeZone: string, instant: Date): number {
  const zoned = readZonedParts(instant, timeZone)
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  )
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  if (minutes === 0) return `UTC${sign}${hours}`
  return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export function wallTimeToInstant(wall: WallTime, timeZone: string): Date {
  const utcGuess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    0,
  )
  const firstOffset = getOffsetMinutes(timeZone, new Date(utcGuess))
  let instant = utcGuess - firstOffset * 60_000
  const secondOffset = getOffsetMinutes(timeZone, new Date(instant))
  if (secondOffset !== firstOffset) {
    instant = utcGuess - secondOffset * 60_000
  }
  return new Date(instant)
}

export function instantToWallTime(instant: Date, timeZone: string): WallTime {
  const zoned = readZonedParts(instant, timeZone)
  return {
    year: zoned.year,
    month: zoned.month,
    day: zoned.day,
    hour: zoned.hour,
    minute: zoned.minute,
  }
}

export function convertWallTime(
  wall: WallTime,
  fromTimeZone: string,
  toTimeZone: string,
): WallTime {
  return instantToWallTime(wallTimeToInstant(wall, fromTimeZone), toTimeZone)
}

function isWorkingHour(hour: number): boolean {
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR
}

/** One slot per local hour. Overlap means both cities are inside [09:00, 18:00). */
export function overlapHours(
  date: Pick<WallTime, 'year' | 'month' | 'day'>,
  localTimeZone: string,
  otherTimeZone: string,
): HourSlot[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const instant = wallTimeToInstant(
      { ...date, hour, minute: 0 },
      localTimeZone,
    )
    const other = instantToWallTime(instant, otherTimeZone)
    return {
      hour,
      overlap: isWorkingHour(hour) && isWorkingHour(other.hour),
    }
  })
}

/**
 * True when daylight saving in either zone changes the UTC-offset gap
 * relative to mid-January of the same year (standard time in Vancouver).
 */
export function isDstChangingOffsetGap(
  instant: Date,
  zoneA: string,
  zoneB: string,
): boolean {
  const january = new Date(Date.UTC(instant.getUTCFullYear(), 0, 15, 18, 0, 0))
  return offsetGap(instant, zoneA, zoneB) !== offsetGap(january, zoneA, zoneB)
}

function offsetGap(instant: Date, zoneA: string, zoneB: string): number {
  return getOffsetMinutes(zoneA, instant) - getOffsetMinutes(zoneB, instant)
}

function formatClock(wall: WallTime): string {
  return `${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`
}

function formatCivilDate(wall: WallTime): string {
  const weekday =
    WEEKDAYS[
      new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay()
    ]
  return `${weekday} ${MONTHS[wall.month - 1]} ${wall.day}`
}

function sameCivilDate(left: WallTime, right: WallTime): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  )
}

/** "Wed Oct 14, 10:00 Vancouver = 14:00 São Paulo" */
export function formatMeetingSummary(
  source: WallTime,
  sourceLabel: string,
  target: WallTime,
  targetLabel: string,
): string {
  const targetText = sameCivilDate(source, target)
    ? `${formatClock(target)} ${targetLabel}`
    : `${formatCivilDate(target)}, ${formatClock(target)} ${targetLabel}`
  return `${formatCivilDate(source)}, ${formatClock(source)} ${sourceLabel} = ${targetText}`
}
