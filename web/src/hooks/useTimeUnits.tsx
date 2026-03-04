import { useTranslation } from 'react-i18next';
import { Unit } from '../time';

/** Returns a function that maps a Unit to its translated label (e.g. "minutes"). */
export const useTimeUnits = (): ((u: Unit) => string) => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const labels = new Map<Unit, string>([
    [Unit.SECOND, t('seconds')],
    [Unit.MINUTE, t('minutes')],
    [Unit.HOUR, t('hours')],
    [Unit.DAY, t('days')],
    [Unit.WEEK, t('weeks')],
  ]);
  return (u: Unit) => labels.get(u) ?? '';
};
