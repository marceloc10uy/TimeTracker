import './HolidaysPanel.css';

function getDaysInYear(year) {
  const days = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
  }
  return days;
}



export default function HolidaysPanel({ year, holidays, personalDays }) {
  return (
    <div>
      <CalendarLegend />
      <CalendarView
        year={year}
        holidays={holidays}
        personalDays={personalDays}
      />
    </div>
  );
}

function CalendarView({ year, holidays, personalDays }) {
  const days = getDaysInYear(year);

  return (
    <div className="year-calendar">
      {Array.from({ length: 12 }, (_, month) => {
        const monthDays = days.filter(d => d.getMonth() === month);

        return (
          <div key={month} className="month">
            <div className='montTitle'>
              {new Date(year, month).toLocaleString("default", { month: "long" })}
            </div>

            {/* Weekday headers */}
            <div className="weekday-headers">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="days-grid">
              {/* Add empty slots before the first day */}
              {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="day empty"></div>
              ))}

              {monthDays.map(d => {
                const iso = d.toISOString().split("T")[0];
                const isHoliday = holidays.includes(iso);
                const isPersonal = personalDays.includes(iso);
                const isBoth = isHoliday && isPersonal;

                return (
                  <div
                    key={iso}
                    className={`day ${ isBoth ? "both" : isHoliday ? "holiday" : isPersonal ? "personal" : "" }`}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function CalendarLegend() {
  return (
    <div className="calendar-legend">
      <div className="legend-item">
        <span className="legend-color holiday"></span>
        <span>Official holiday</span>
      </div>
      <div className="legend-item">
        <span className="legend-color personal"></span>
        <span>My holiday</span>
      </div>
      <div className="legend-item">
        <span className="legend-color both"></span>
        <span>Both</span>
      </div>
      <div className="legend-item">
        <span className="legend-color current-day"></span>
        <span>Current Day</span>
      </div>
    </div>
  );
}

