import React, { useState, useEffect } from 'react';
import './AvailabilityCalendar.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

const AvailabilityCalendar = ({ 
  tourId, 
  selectedDate, 
  onDateSelect,
  onAvailabilityChange, // Callback to pass availability info
  disabled = false 
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load availability data
  useEffect(() => {
    if (!tourId || disabled) {
      setLoading(false);
      return;
    }

    const loadAvailability = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        
        // Get availability for next 3 months
        const dateFrom = new Date().toISOString().split('T')[0];
        const dateTo = new Date();
        dateTo.setMonth(dateTo.getMonth() + 3);
        const dateToStr = dateTo.toISOString().split('T')[0];

        const response = await fetch(
          `${API_BASE_URL}/api/guide-availability?tour_id=${tourId}&date_from=${dateFrom}&date_to=${dateToStr}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();
        
        if (data.success && data.availability) {
          setAvailability(data.availability);
        } else {
          console.error('Failed to load availability:', data);
          setAvailability([]);
        }
      } catch (error) {
        console.error('Error loading availability:', error);
        setAvailability([]);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [tourId, disabled]);

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

  // Check if date is available
  const isDateAvailable = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availability.find(s => s.date === dateStr);
    
    if (!slot) return false; // No slot = not available
    
    return slot.is_available && !slot.is_blocked && slot.available_spots > 0;
  };

  // Check if date is blocked/booked
  const isDateBlocked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availability.find(s => s.date === dateStr);
    
    if (!slot) return false;
    
    return slot.is_blocked || slot.available_spots === 0;
  };

  // Check if date is in the past
  const isPastDate = (date) => {
    return date < today;
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (disabled) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    if (isPastDate(date)) return;
    if (!isDateAvailable(date)) return;
    
    // Find slot info for selected date
    const slot = availability.find(s => s.date === dateStr);
    const availableSpots = slot ? slot.available_spots : 0;
    const maxGroupSize = slot ? slot.max_group_size : 0;
    const bookedSpots = slot ? (slot.booked_spots || 0) : 0;
    
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
    
    // Pass availability info to parent
    if (onAvailabilityChange && slot) {
      onAvailabilityChange({
        date: dateStr,
        availableSpots: availableSpots,
        maxGroupSize: maxGroupSize,
        bookedSpots: bookedSpots
      });
    }
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

  // Generate calendar days
  const days = [];
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    days.push(date);
  }

  if (loading) {
    return (
      <div className="availability-calendar-loading">
        <div className="loading-spinner"></div>
        <p>Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="availability-calendar">
      <div className="availability-calendar-header">
        <button 
          type="button"
          onClick={goToPreviousMonth}
          className="calendar-nav-button"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="calendar-month-year">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <button 
          type="button"
          onClick={goToNextMonth}
          className="calendar-nav-button"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="availability-calendar-weekdays">
        {WEEKDAYS.map((day, index) => (
          <div key={index} className="weekday-header">
            {day}
          </div>
        ))}
      </div>

      <div className="availability-calendar-grid">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="calendar-day empty"></div>;
          }

          const dateStr = date.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          const isAvailable = isDateAvailable(date);
          const isBlocked = isDateBlocked(date);
          const isPast = isPastDate(date);
          const isClickable = !disabled && !isPast && isAvailable && !isBlocked;

          return (
            <div
              key={index}
              className={`calendar-day ${
                isSelected ? 'selected' : ''
              } ${
                isAvailable && !isBlocked && !isPast ? 'available' : ''
              } ${
                isBlocked || (!isAvailable && !isPast) ? 'blocked' : ''
              } ${
                isPast ? 'past' : ''
              } ${
                isClickable ? 'clickable' : ''
              }`}
              onClick={() => handleDateClick(date)}
              title={
                isPast 
                  ? 'Past date' 
                  : isBlocked 
                    ? 'Not available' 
                    : isAvailable 
                      ? 'Available' 
                      : 'Not available'
              }
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="availability-calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color blocked"></div>
          <span>Not available</span>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;

