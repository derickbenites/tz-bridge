import { describe, expect, it } from 'vitest'
import {
  SAO_PAULO,
  VANCOUVER,
  convertWallTime,
  formatMeetingSummary,
  formatUtcOffset,
  getOffsetMinutes,
  isDstChangingOffsetGap,
  overlapHours,
  wallTimeToInstant,
  type WallTime,
} from './time'

const oct14At10: WallTime = {
  year: 2026,
  month: 10,
  day: 14,
  hour: 10,
  minute: 0,
}
const oct31At10: WallTime = {
  year: 2026,
  month: 10,
  day: 31,
  hour: 10,
  minute: 0,
}
const nov2At10: WallTime = {
  year: 2026,
  month: 11,
  day: 2,
  hour: 10,
  minute: 0,
}

function overlappingHours(
  date: Pick<WallTime, 'year' | 'month' | 'day'>,
  localTimeZone: string,
  otherTimeZone: string,
) {
  return overlapHours(date, localTimeZone, otherTimeZone)
    .filter((slot) => slot.overlap)
    .map((slot) => slot.hour)
}

describe('daylight saving in Vancouver', () => {
  it('keeps a 4 hour gap on Oct 31, 2026, before Pacific DST ends', () => {
    expect(convertWallTime(oct31At10, VANCOUVER, SAO_PAULO)).toEqual({
      year: 2026,
      month: 10,
      day: 31,
      hour: 14,
      minute: 0,
    })

    const instant = wallTimeToInstant(oct31At10, VANCOUVER)
    expect(formatUtcOffset(getOffsetMinutes(VANCOUVER, instant))).toBe('UTC-7')
    expect(formatUtcOffset(getOffsetMinutes(SAO_PAULO, instant))).toBe('UTC-3')
    expect(isDstChangingOffsetGap(instant, SAO_PAULO, VANCOUVER)).toBe(true)
  })

  it('widens the gap to 5 hours on Nov 2, 2026, after Pacific DST ends', () => {
    expect(convertWallTime(nov2At10, VANCOUVER, SAO_PAULO)).toEqual({
      year: 2026,
      month: 11,
      day: 2,
      hour: 15,
      minute: 0,
    })

    const instant = wallTimeToInstant(nov2At10, VANCOUVER)
    expect(formatUtcOffset(getOffsetMinutes(VANCOUVER, instant))).toBe('UTC-8')
    expect(formatUtcOffset(getOffsetMinutes(SAO_PAULO, instant))).toBe('UTC-3')
    expect(isDstChangingOffsetGap(instant, SAO_PAULO, VANCOUVER)).toBe(false)
  })
})

describe('convertWallTime', () => {
  it('converts a normal afternoon from São Paulo back to Vancouver', () => {
    expect(
      convertWallTime(
        { year: 2026, month: 10, day: 14, hour: 14, minute: 30 },
        SAO_PAULO,
        VANCOUVER,
      ),
    ).toEqual({ year: 2026, month: 10, day: 14, hour: 10, minute: 30 })
  })

  it('rolls the São Paulo date forward when Vancouver is still on the previous evening', () => {
    expect(
      convertWallTime(
        { year: 2026, month: 10, day: 14, hour: 22, minute: 0 },
        VANCOUVER,
        SAO_PAULO,
      ),
    ).toEqual({ year: 2026, month: 10, day: 15, hour: 2, minute: 0 })
  })
})

describe('overlapHours', () => {
  it('highlights 09:00–14:00 Vancouver while Pacific daylight time is in effect', () => {
    expect(
      overlappingHours(
        { year: 2026, month: 10, day: 14 },
        VANCOUVER,
        SAO_PAULO,
      ),
    ).toEqual([9, 10, 11, 12, 13])
  })

  it('shrinks the overlap to 09:00–13:00 Vancouver after the clocks fall back', () => {
    expect(
      overlappingHours({ year: 2026, month: 11, day: 2 }, VANCOUVER, SAO_PAULO),
    ).toEqual([9, 10, 11, 12])
  })

  it('reports the same window from the São Paulo side of the strip', () => {
    expect(
      overlappingHours(
        { year: 2026, month: 10, day: 14 },
        SAO_PAULO,
        VANCOUVER,
      ),
    ).toEqual([13, 14, 15, 16, 17])
  })
})

describe('formatMeetingSummary', () => {
  it('matches the one-line copy when both cities share the date', () => {
    expect(
      formatMeetingSummary(
        oct14At10,
        'Vancouver',
        {
          year: 2026,
          month: 10,
          day: 14,
          hour: 14,
          minute: 0,
        },
        'São Paulo',
      ),
    ).toBe('Wed Oct 14, 10:00 Vancouver = 14:00 São Paulo')
  })

  it('includes the other date when the meeting crosses midnight', () => {
    expect(
      formatMeetingSummary(
        { year: 2026, month: 10, day: 14, hour: 22, minute: 0 },
        'Vancouver',
        { year: 2026, month: 10, day: 15, hour: 2, minute: 0 },
        'São Paulo',
      ),
    ).toBe('Wed Oct 14, 22:00 Vancouver = Thu Oct 15, 02:00 São Paulo')
  })
})
