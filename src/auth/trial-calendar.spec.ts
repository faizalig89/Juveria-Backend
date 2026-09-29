import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  addOneCalendarMonth,
} from './trial-calendar.js';

describe('addOneCalendarMonth', () => {
  it('keeps the same calendar day when available', () => {
    const start =
      new Date(
        '2026-09-28T17:30:00.000Z',
      );

    expect(
      addOneCalendarMonth(
        start,
      ).toISOString(),
    ).toBe(
      '2026-10-28T17:30:00.000Z',
    );
  });

  it('clamps a month-end date safely', () => {
    const start =
      new Date(
        '2027-01-31T10:15:00.000Z',
      );

    expect(
      addOneCalendarMonth(
        start,
      ).toISOString(),
    ).toBe(
      '2027-02-28T10:15:00.000Z',
    );
  });

  it('handles leap-year February', () => {
    const start =
      new Date(
        '2028-01-31T10:15:00.000Z',
      );

    expect(
      addOneCalendarMonth(
        start,
      ).toISOString(),
    ).toBe(
      '2028-02-29T10:15:00.000Z',
    );
  });
});
