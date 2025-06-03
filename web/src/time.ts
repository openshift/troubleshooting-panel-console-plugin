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
    return this.count * this.unit.value;
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

/** Named time unit: seconds, minutes, hours etc. */
export class Unit {
  constructor(public readonly name: string, public readonly value: number) {
    Unit.byName[this.name] = this;
  }
  static byName = new Map<string, Unit>();
  static all() {
    return Object.values(Unit.byName).sort((a, b) => a.value - b.value);
  }
  static get(name: string): Unit {
    return Unit.byName[name];
  }
}

export const SECOND = new Unit('seconds', 1000);
export const MINUTE = new Unit('minutes', 60 * SECOND.value);
export const HOUR = new Unit('hours', 60 * MINUTE.value);
export const DAY = new Unit('days', 24 * HOUR.value);
export const WEEK = new Unit('weeks', 7 * DAY.value);

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

// FIXME validation
