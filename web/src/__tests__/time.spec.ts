import * as time from '../time';

describe('Range', () => {
  it('constructs', () => {
    const [start, end] = [new Date(1969, 3, 21), new Date(1969, 3, 22)];
    const range = new time.Range(start, end);
    expect(range.startEnd()).toEqual([start, end]);
  });
});

describe('Duration', () => {
  it('constructs', () => {
    const duration = new time.Duration(1000, time.Unit.SECOND);
    const [start, end] = duration.startEnd();
    const now = Date.now();
    expect(duration.duration()).toEqual(1000 * time.Unit.SECOND);
    expect(end.getTime() - start.getTime()).toEqual(1000 * time.Unit.SECOND);
    expect(Math.floor(end.getTime() / 100)).toEqual(Math.floor(now / 100));
  });
});

describe('Unit', () => {
  it('units lists all units in order', () => {
    expect(time.units).toEqual([
      time.Unit.SECOND,
      time.Unit.MINUTE,
      time.Unit.HOUR,
      time.Unit.DAY,
      time.Unit.WEEK,
    ]);
  });
});
