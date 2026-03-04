/** Immutable time period. There are two types of time period:
 * - duration up to now, no explicit end time.
 * - start/end range with explicit start and end Date
 */
export interface Period {
  /** [start, end] of period */
  startEnd(): [Date, Date];
}

/** Duration is a count of some time unit (hours, days etc.) */
export class Duration implements Period {
  constructor(public readonly count: number, public readonly unit: Unit) {}
  duration(): number {
    return this.count * this.unit;
  }
  startEnd(): [Date, Date] {
    const end = new Date();
    return [new Date(end.getTime() - this.duration()), end];
  }
}

/** Range is an explicit pair of start/end time points */
export class Range implements Period {
  constructor(public readonly start: Date, public readonly end: Date) {}
  startEnd(): [Date, Date] {
    return [this.start, this.end];
  }
}

export enum Unit {
  SECOND = 1000,
  MINUTE = 60 * SECOND,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR,
  WEEK = 7 * DAY,
}

export const units: Unit[] = [Unit.SECOND, Unit.MINUTE, Unit.HOUR, Unit.DAY, Unit.WEEK];

/** Modify a Date by setting the time-of-day part only.
 *  @returns the modified date.
 */
export const setTime = (to: Date, hours = 0, minutes = 0, seconds = 0, milliseconds = 0): Date => {
  if (isValidDate(to)) {
    to.setHours(hours);
    to.setMinutes(minutes);
    to.setSeconds(seconds);
    to.setMilliseconds(milliseconds);
  }
  return to;
};

/**
 *  Modify a date by copying the time-of-day from another date.
 *  @returns the modified date.
 */
export const copyTime = (to: Date, from: Date): Date => {
  return setTime(to, from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds());
};

// NOTE: Define our own isValidDate - don't import react modules in a plain .ts file.
export const isValidDate = (date?: Date) => Boolean(date && !isNaN(date.valueOf()));

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
