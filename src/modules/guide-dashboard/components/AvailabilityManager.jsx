/**
 * AvailabilityManager - Component for managing tour availability
 * Shows calendar and table for managing date availability slots
 */

import { useState, useEffect } from 'react';
import { getTourAvailability, updateAvailabilitySlots, bulkBlockDates, updateAvailabilitySlot } from '../services/availabilityService';
import './AvailabilityManager.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

export default function AvailabilityManager({ tour, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availability, setAvailability] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [defaultGroupSize, setDefaultGroupSize] = useState(10);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    loadAvailability();
  }, [tour.id, dateFrom, dateTo]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      const slots = await getTourAvailability(tour.id, dateFrom, dateTo);
      setAvailability(slots);
      
      // Set default group size from tour or first slot
      if (slots.length > 0) {
        setDefaultGroupSize(slots[0].max_group_size || 10);
      } else if (tour.default_group_size) {
        setDefaultGroupSize(tour.default_group_size);
      }
    } catch (err) {
      setError(err.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const date = new Date(year, month, 1);
    return (date.getDay() + 6) % 7; // Monday = 0
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const isDateSelected = (date) => {
    return selectedDates.some(d => formatDate(d) === formatDate(date));
  };

  const getSlotForDate = (date) => {
    const dateStr = formatDate(date);
    return availability.find(s => s.date === dateStr);
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    clickedDate.setHours(0, 0, 0, 0);

    if (clickedDate < today) return; // Can't select past dates

    setSelectedDates(prev => {
      const dateStr = formatDate(clickedDate);
      if (prev.some(d => formatDate(d) === dateStr)) {
        return prev.filter(d => formatDate(d) !== dateStr);
      } else {
        return [...prev, clickedDate];
      }
    });
  };

  const handleMarkAsAvailable = async () => {
    if (selectedDates.length === 0) {
      setError('Please select dates');
      return;
    }

    // Validate group size
    if (!defaultGroupSize || defaultGroupSize < 1) {
      setError('Please enter a valid number of available spots (at least 1)');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const slots = selectedDates.map(date => ({
        date: formatDate(date),
        max_group_size: defaultGroupSize,
        is_available: true,
        is_blocked: false
      }));

      await updateAvailabilitySlots(tour.id, slots);
      setSuccess(`Marked ${selectedDates.length} date(s) as available`);
      setSelectedDates([]);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to mark dates as available');
    } finally {
      setSaving(false);
    }
  };

  // Clear availability for selected dates (remove them from available dates)
  const handleClearAvailability = async () => {
    if (selectedDates.length === 0) {
      setError('Please select dates');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Update slots to be unavailable (is_available = false)
      const slots = selectedDates.map(date => ({
        date: formatDate(date),
        max_group_size: defaultGroupSize,
        is_available: false,
        is_blocked: false
      }));

      await updateAvailabilitySlots(tour.id, slots);
      setSuccess(`Cleared availability for ${selectedDates.length} date(s)`);
      setSelectedDates([]);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to clear availability');
    } finally {
      setSaving(false);
    }
  };


  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="availability-calendar-day empty" />);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      date.setHours(0, 0, 0, 0);

      const isToday = date.getTime() === today.getTime();
      const isPast = date.getTime() < today.getTime();
      const isSelected = isDateSelected(date);
      const slot = getSlotForDate(date);

      let className = 'availability-calendar-day';
      if (isToday) className += ' today';
      if (isPast) className += ' past';
      if (isSelected) className += ' selected';
      
      // Color coding based on availability
      // Only show green if date is available (is_available = true and not blocked)
      // Empty dates (no slot) = white (unavailable)
      if (slot && slot.is_available && !slot.is_blocked) {
        className += ' available';
      }
      // All other cases (blocked, not available, or no slot) remain default (white)

      days.push(
        <button
          key={i}
          type="button"
          className={className}
          onClick={() => !isPast && handleDateClick(i)}
          disabled={isPast}
          title={slot ? `${slot.available_spots} spots available` : 'No slot'}
        >
          <div className="day-number">{i}</div>
          {slot && (
            <div className="day-info">
              <div className="spots">{slot.available_spots}/{slot.max_group_size}</div>
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(year => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(year => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <div className="availability-manager-overlay" onClick={onClose}>
      <div className="availability-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="availability-manager-header">
          <h2>Manage Availability - {tour.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="availability-error">
            {error}
          </div>
        )}

        {success && (
          <div className="availability-success">
            {success}
          </div>
        )}

        <div className="availability-manager-content">
          {/* Settings Panel */}
          <div className="availability-settings">
            {/* Input for number of available spots */}
            <div className="setting-group">
              <label>Number of available spots:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={defaultGroupSize}
                onChange={(e) => setDefaultGroupSize(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '12px'
                }}
                placeholder="Enter number of spots"
              />
            </div>

            <div className="setting-group">
              <label>Selected Dates: {selectedDates.length}</label>
              <div className="action-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleMarkAsAvailable}
                  disabled={selectedDates.length === 0 || saving || !defaultGroupSize || defaultGroupSize < 1}
                  className="action-btn available"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (selectedDates.length === 0 || saving || !defaultGroupSize || defaultGroupSize < 1) ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: (selectedDates.length === 0 || saving || !defaultGroupSize || defaultGroupSize < 1) ? 0.6 : 1
                  }}
                >
                  Mark as Available
                </button>
                <button
                  onClick={handleClearAvailability}
                  disabled={selectedDates.length === 0 || saving}
                  className="action-btn clear"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (selectedDates.length === 0 || saving) ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: (selectedDates.length === 0 || saving) ? 0.6 : 1
                  }}
                >
                  Clear Availability
                </button>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="availability-calendar-section">
            <div className="calendar-header">
              <button onClick={goToPreviousMonth} className="calendar-nav-btn">←</button>
              <div className="calendar-month-year">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button onClick={goToNextMonth} className="calendar-nav-btn">→</button>
            </div>

            <div className="calendar-weekdays">
              {WEEKDAYS.map((day, index) => (
                <div key={index} className="weekday">{day}</div>
              ))}
            </div>

            <div className="calendar-days-grid">
              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                renderDays()
              )}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Available (3+ spots)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color low-availability"></div>
                <span>Low availability (&lt;3 spots)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color full"></div>
                <span>Full (0 spots)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color blocked"></div>
                <span>Blocked</span>
              </div>
            </div>
          </div>

          {/* Availability Table */}
          <div className="availability-table-section">
            <h3>Availability Details</h3>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : availability.length === 0 ? (
              <p className="no-data">No availability slots set. Select dates and mark them as available.</p>
            ) : (
              <table className="availability-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Max Group</th>
                    <th>Booked</th>
                    <th>Available</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {availability
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(slot => (
                      <tr key={slot.id} className={slot.is_blocked ? 'blocked-row' : ''}>
                        <td>{new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{slot.max_group_size}</td>
                        <td>{slot.booked_spots}</td>
                        <td>{slot.available_spots}</td>
                        <td>
                          {slot.is_blocked ? (
                            <span className="status-badge blocked">Blocked</span>
                          ) : slot.available_spots === 0 ? (
                            <span className="status-badge full">Full</span>
                          ) : (
                            <span className="status-badge available">Available</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={async () => {
                              try {
                                await updateAvailabilitySlot(slot.id, {
                                  is_blocked: !slot.is_blocked
                                });
                                await loadAvailability();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                            className="table-action-btn"
                          >
                            {slot.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="availability-manager-footer">
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    </div>
  );
}

