import React, { useState, useEffect, useRef } from 'react';
import './DateRangePicker.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

const DateRangePicker = ({ 
  selectedDates = [], 
  onChange, 
  minDate = null,
  onClose 
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState(selectedDates[0] ? new Date(selectedDates[0]) : null);
  const [endDate, setEndDate] = useState(selectedDates[1] ? new Date(selectedDates[1]) : null);
  const [hoverDate, setHoverDate] = useState(null);
  const calendarRef = useRef(null);

  // Set minimum date to today if not provided
  const minDateObj = minDate ? new Date(minDate) : today;
  minDateObj.setHours(0, 0, 0, 0);

  // Initialize current month to show today or first selected date
  useEffect(() => {
    if (selectedDates[0]) {
      const firstDate = new Date(selectedDates[0]);
      setCurrentMonth(firstDate.getMonth());
      setCurrentYear(firstDate.getFullYear());
    }
  }, []);

  // Get days in month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    // Convert to Monday = 0, Tuesday = 1, etc.
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  // Check if date is in range
  const isDateInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  // Check if date is start or end
  const isStartDate = (date) => {
    if (!startDate) return false;
    return date.getTime() === startDate.getTime();
  };

  const isEndDate = (date) => {
    if (!endDate) return false;
    return date.getTime() === endDate.getTime();
  };

  // Check if date is disabled (past dates)
  const isDateDisabled = (date) => {
    return date < minDateObj;
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Complete selection
      if (date < startDate) {
        // If clicked date is before start, swap them
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Update parent when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const dates = [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ].sort();
      onChange(dates);
    } else if (startDate) {
      onChange([startDate.toISOString().split('T')[0]]);
    } else {
      onChange([]);
    }
  }, [startDate, endDate]);

  // Quick select handlers
  const handleQuickSelect = (type) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start, end;
    
    switch (type) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'tomorrow':
        start = new Date(today);
        start.setDate(start.getDate() + 1);
        end = new Date(start);
        break;
      case 'nextWeekend':
        // Find next Saturday
        start = new Date(today);
        const daysUntilSaturday = (6 - start.getDay() + 7) % 7 || 7;
        start.setDate(start.getDate() + daysUntilSaturday);
        // End date is Sunday (next day)
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;
      default:
        return;
    }
    
    setStartDate(start);
    setEndDate(end);
    
    // Update calendar view to show selected dates
    setCurrentMonth(start.getMonth());
    setCurrentYear(start.getFullYear());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push(date);
    }
    
    return days;
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day < 10 ? '0' : ''}${day}.${month < 10 ? '0' : ''}${month}`;
  };

  const calendarDays = generateCalendarDays();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="date-range-picker" ref={calendarRef} onClick={handleBackdropClick}>
      <div className="date-range-picker-container" onClick={(e) => e.stopPropagation()}>
        {/* Quick Select Buttons */}
        <div className="quick-select-buttons">
          <button
            type="button"
            className="quick-select-btn"
            onClick={() => handleQuickSelect('today')}
          >
            <div className="quick-select-label">Сегодня</div>
            <div className="quick-select-date">{formatDate(todayDate)}</div>
          </button>
          <button
            type="button"
            className="quick-select-btn"
            onClick={() => handleQuickSelect('tomorrow')}
          >
            <div className="quick-select-label">Завтра</div>
            <div className="quick-select-date">
              {formatDate(new Date(todayDate.getTime() + 24 * 60 * 60 * 1000))}
            </div>
          </button>
          <button
            type="button"
            className="quick-select-btn"
            onClick={() => handleQuickSelect('nextWeekend')}
          >
            <div className="quick-select-label">Следующие выходные</div>
            <div className="quick-select-date">
              {(() => {
                const nextSat = new Date(todayDate);
                const daysUntilSaturday = (6 - nextSat.getDay() + 7) % 7 || 7;
                nextSat.setDate(nextSat.getDate() + daysUntilSaturday);
                const nextSun = new Date(nextSat);
                nextSun.setDate(nextSun.getDate() + 1);
                return `${formatDate(nextSat)}-${formatDate(nextSun)}`;
              })()}
            </div>
          </button>
        </div>

        {/* Calendar */}
        <div className="calendar-section">
          {/* Calendar Header */}
          <div className="calendar-header">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            >
              ←
            </button>
            <div className="calendar-month-year">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              →
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="calendar-weekdays">
            {WEEKDAYS.map((day, index) => (
              <div key={index} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={index} className="calendar-day empty" />;
              }

              const dateObj = new Date(date);
              dateObj.setHours(0, 0, 0, 0);
              
              const isToday = dateObj.getTime() === todayDate.getTime();
              const isDisabled = isDateDisabled(dateObj);
              const isStart = isStartDate(dateObj);
              const isEnd = isEndDate(dateObj);
              const isInRange = isDateInRange(dateObj);
              const isHovered = hoverDate && dateObj.getTime() === hoverDate.getTime();

              // Check if date is in hover range
              let isInHoverRange = false;
              if (startDate && !endDate && hoverDate) {
                const hoverDateObj = new Date(hoverDate);
                hoverDateObj.setHours(0, 0, 0, 0);
                if (startDate < hoverDateObj) {
                  isInHoverRange = dateObj > startDate && dateObj < hoverDateObj;
                } else {
                  isInHoverRange = dateObj < startDate && dateObj > hoverDateObj;
                }
              }

              return (
                <button
                  key={index}
                  type="button"
                  className={`calendar-day ${
                    isToday ? 'today' : ''
                  } ${
                    isDisabled ? 'disabled' : ''
                  } ${
                    isStart ? 'start-date' : ''
                  } ${
                    isEnd ? 'end-date' : ''
                  } ${
                    isInRange ? 'in-range' : ''
                  } ${
                    isInHoverRange ? 'hover-range' : ''
                  }`}
                  onClick={() => handleDateClick(dateObj)}
                  onMouseEnter={() => !isDisabled && setHoverDate(dateObj)}
                  onMouseLeave={() => setHoverDate(null)}
                  disabled={isDisabled}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="calendar-actions">
          <button
            type="button"
            className="calendar-action-btn clear-btn"
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
              onChange([]);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="calendar-action-btn today-btn"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setCurrentMonth(today.getMonth());
              setCurrentYear(today.getFullYear());
            }}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;

