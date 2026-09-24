import { useMemo, useState } from 'react';

import styles from './Calendar.module.css';

const DAY_NAMES = [
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
];

const MONTHS = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
];

const Calendar = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekDays, calendarRange } = useMemo(() => {
    const today = new Date();

    const currentDay =
      today.getDay() === 0
        ? 7
        : today.getDay();

    const monday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() -
        currentDay +
        1 +
        weekOffset * 7
    );

    const days = DAY_NAMES.map((day, index) => {
      const date = new Date(monday);

      date.setDate(
        monday.getDate() + index
      );

      return {
        day,
        date: date.getDate(),
        month: MONTHS[date.getMonth()],
        isToday:
          date.toDateString() ===
          today.toDateString(),
      };
    });

    const first = days[0];
    const last = days[days.length - 1];

    const range =
      first.month === last.month
        ? `${first.date}–${last.date} ${last.month}`
        : `${first.date} ${first.month} – ${last.date} ${last.month}`;

    return {
      weekDays: days,
      calendarRange: range,
    };
  }, [weekOffset]);

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <h2>Календар на тиждень</h2>
      </div>

      <div className={styles.navigation}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() =>
            setWeekOffset((prev) => prev - 1)
          }
          aria-label="Попередній тиждень"
        >
          ‹
        </button>

        <span className={styles.range}>
          {calendarRange}
        </span>

        <button
          type="button"
          className={styles.arrow}
          onClick={() =>
            setWeekOffset((prev) => prev + 1)
          }
          aria-label="Наступний тиждень"
        >
          ›
        </button>
      </div>

      <div className={styles.grid}>
        {weekDays.map((day) => (
          <div
            key={`${day.day}-${day.date}-${day.month}`}
            className={`${styles.day} ${
              day.isToday ? styles.today : ''
            }`}
          >
            <strong>{day.day}</strong>

            <span>
              {day.date} {day.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;