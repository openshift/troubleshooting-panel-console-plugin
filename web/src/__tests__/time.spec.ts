import {
  copyTime,
  Duration,
  formatDate,
  isValidDate,
  Range,
  SECOND,
  setTime,
  Unit,
  units,
} from '../time';

describe('Range', () => {
  it('constructs', () => {
    const [start, end] = [new Date(1969, 3, 21), new Date(1969, 3, 22)];
    const range = new Range(start, end);
    expect(range.startEnd()).toEqual([start, end]);
  });
});

describe('Duration', () => {
  it('constructs', () => {
    const duration = new Duration(1000, Unit.SECOND);
    const [start, end] = duration.startEnd();
    const now = Date.now();
    expect(duration.duration()).toEqual(1000 * SECOND);
    expect(end.getTime() - start.getTime()).toEqual(1000 * SECOND);
    expect(Math.floor(end.getTime() / 100)).toEqual(Math.floor(now / 100));
  });
});

describe('Unit', () => {
  it('has correct values', () => {
    expect(Unit.SECOND).toEqual(1000);
    expect(Unit.MINUTE).toEqual(60 * 1000);
    expect(Unit.HOUR).toEqual(60 * 60 * 1000);
    expect(Unit.DAY).toEqual(24 * 60 * 60 * 1000);
    expect(Unit.WEEK).toEqual(7 * 24 * 60 * 60 * 1000);
  });

  it('units array contains all units in order', () => {
    expect(units).toEqual([Unit.SECOND, Unit.MINUTE, Unit.HOUR, Unit.DAY, Unit.WEEK]);
  });
});

describe('setTime', () => {
  it('sets time-of-day fields', () => {
    const date = new Date(2024, 5, 15, 0, 0, 0, 0);
    setTime(date, 10, 30, 45, 500);
    expect(date.getHours()).toEqual(10);
    expect(date.getMinutes()).toEqual(30);
    expect(date.getSeconds()).toEqual(45);
    expect(date.getMilliseconds()).toEqual(500);
  });

  it('defaults to midnight', () => {
    const date = new Date(2024, 5, 15, 13, 45, 30, 999);
    setTime(date);
    expect(date.getHours()).toEqual(0);
    expect(date.getMinutes()).toEqual(0);
    expect(date.getSeconds()).toEqual(0);
    expect(date.getMilliseconds()).toEqual(0);
  });

  it('returns the modified date', () => {
    const date = new Date(2024, 5, 15);
    const result = setTime(date, 8);
    expect(result).toBe(date);
  });

  it('does not modify an invalid date', () => {
    const invalid = new Date('invalid');
    const result = setTime(invalid, 10, 30);
    expect(result).toBe(invalid);
    expect(isNaN(result.getTime())).toBe(true);
  });
});

describe('copyTime', () => {
  it('copies time-of-day from one date to another', () => {
    const to = new Date(2024, 5, 15, 0, 0, 0, 0);
    const from = new Date(2020, 0, 1, 14, 25, 50, 123);
    copyTime(to, from);
    expect(to.getFullYear()).toEqual(2024);
    expect(to.getMonth()).toEqual(5);
    expect(to.getDate()).toEqual(15);
    expect(to.getHours()).toEqual(14);
    expect(to.getMinutes()).toEqual(25);
    expect(to.getSeconds()).toEqual(50);
    expect(to.getMilliseconds()).toEqual(123);
  });
});

describe('isValidDate', () => {
  it('returns true for valid dates', () => {
    expect(isValidDate(new Date())).toBe(true);
    expect(isValidDate(new Date(0))).toBe(true);
    expect(isValidDate(new Date(2024, 0, 1))).toBe(true);
  });

  it('returns false for invalid dates', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD HH:MM', () => {
    const date = new Date(2024, 0, 5, 9, 3);
    expect(formatDate(date)).toEqual('2024-01-05 09:03');
  });

  it('pads single-digit values', () => {
    const date = new Date(2024, 2, 1, 1, 2);
    expect(formatDate(date)).toEqual('2024-03-01 01:02');
  });

  it('handles end of year', () => {
    const date = new Date(2024, 11, 31, 23, 59);
    expect(formatDate(date)).toEqual('2024-12-31 23:59');
  });
});
