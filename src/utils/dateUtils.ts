
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const parseToDayjs = (value: any): Dayjs | null => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;

  if (typeof value === 'object' && (value.seconds || value._seconds)) {
    return dayjs.unix(value.seconds || value._seconds);
  }
  
  const date = dayjs(value);
  return date.isValid() ? date : null;
};

export const formatDateForDisplay = (value: any): string => {
    const parsedDate = parseToDayjs(value);
    return parsedDate ? parsedDate.format('DD/MM/YYYY') : 'Data Invalida';
};

export const getWeeksInMonth = (date: Date): Date[][] => {
  const monthStart = dayjs(date).startOf('month');
  const monthEnd = dayjs(date).endOf('month');

  const firstDay = monthStart.startOf('week');
  const lastDay = monthEnd.endOf('week');

  const days: Date[] = [];
  let currentDay = firstDay;
  while(currentDay.isSameOrBefore(lastDay, 'day')) {
      days.push(currentDay.toDate());
      currentDay = currentDay.add(1, 'day');
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
};
