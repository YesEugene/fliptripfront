/**
 * Availability Service - API calls for managing tour availability
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripbackend.vercel.app';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

/**
 * Get availability slots for a tour
 */
export async function getTourAvailability(tourId, dateFrom = null, dateTo = null) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    let url = `${API_BASE_URL}/api/guide-availability?tour_id=${tourId}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch availability');
    }

    return data.availability || [];
  } catch (error) {
    console.error('Error fetching availability:', error);
    throw error;
  }
}

/**
 * Create or update availability slots
 */
export async function updateAvailabilitySlots(tourId, slots) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-availability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tour_id: tourId,
        slots: slots
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update availability slots');
    }

    return data;
  } catch (error) {
    console.error('Error updating availability slots:', error);
    throw error;
  }
}

/**
 * Bulk block/unblock dates
 */
export async function bulkBlockDates(tourId, dates, isBlocked = true) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-availability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tour_id: tourId,
        bulk_block: {
          dates: dates,
          is_blocked: isBlocked
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to block dates');
    }

    return data;
  } catch (error) {
    console.error('Error blocking dates:', error);
    throw error;
  }
}

/**
 * Update a single availability slot
 */
export async function updateAvailabilitySlot(slotId, updates) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-availability?slot_id=${slotId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update availability slot');
    }

    return data.slot;
  } catch (error) {
    console.error('Error updating availability slot:', error);
    throw error;
  }
}

