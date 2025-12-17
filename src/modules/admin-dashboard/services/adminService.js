/**
 * Admin Dashboard Service
 * API calls for admin dashboard
 */

// Auto-detect API URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://fliptripback.vercel.app';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Get auth token
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(period = null) {
  try {
    const token = getAuthToken();
    const url = period 
      ? `${API_BASE_URL}/api/admin-stats?period=${period}`
      : `${API_BASE_URL}/api/admin-stats`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching statistics');
    }

    return data;
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw error;
  }
}

/**
 * Get all locations
 */
export async function getLocations(filters = {}) {
  try {
    const token = getAuthToken();
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/api/admin-locations?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching locations');
    }

    return data;
  } catch (error) {
    console.error('Get locations error:', error);
    throw error;
  }
}

/**
 * Get location by ID
 */
export async function getLocationById(locationId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-locations?id=${locationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching location');
    }

    return data;
  } catch (error) {
    console.error('Get location error:', error);
    throw error;
  }
}

/**
 * Create location
 */
export async function createLocation(locationData) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(locationData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error creating location');
    }

    return data;
  } catch (error) {
    console.error('Create location error:', error);
    throw error;
  }
}

/**
 * Update location
 */
export async function updateLocation(locationId, locationData) {
  try {
    const token = getAuthToken();
    console.log('📡 PUT request to:', `${API_BASE_URL}/api/admin-locations?id=${locationId}`);
    console.log('📡 Request data:', locationData);
    
    const response = await fetch(`${API_BASE_URL}/api/admin-locations?id=${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(locationData)
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    const data = await response.json();
    console.log('📡 Response data:', data);

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Error updating location');
    }

    return data;
  } catch (error) {
    console.error('❌ Update location error:', error);
    throw error;
  }
}

/**
 * Delete location
 */
export async function deleteLocation(locationId) {
  try {
    const token = getAuthToken();
    console.log('📡 DELETE request to:', `${API_BASE_URL}/api/admin-locations?id=${locationId}`);
    console.log('📡 Token:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/api/admin-locations?id=${locationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    const data = await response.json();
    console.log('📡 Response data:', data);

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Error deleting location');
    }

    return data;
  } catch (error) {
    console.error('❌ Delete location error:', error);
    throw error;
  }
}

/**
 * Get all tours
 */
export async function getTours(filters = {}) {
  try {
    const token = getAuthToken();
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/api/admin-tours?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching tours');
    }

    return data;
  } catch (error) {
    console.error('Get tours error:', error);
    throw error;
  }
}

/**
 * Get all tags
 */
export async function getTags() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching tags');
    }

    return data;
  } catch (error) {
    console.error('Get tags error:', error);
    throw error;
  }
}

/**
 * Get all users
 */
export async function getUsers(filters = {}) {
  try {
    const token = getAuthToken();
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/api/admin-users?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching users');
    }

    return data;
  } catch (error) {
    console.error('Get users error:', error);
    throw error;
  }
}

/**
 * Create user by email
 */
export async function createUserByEmail(email, role = 'user', name = null) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email,
        role,
        name,
        createByEmail: true
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error creating user');
    }

    return data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(userId, userData) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-users?id=${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error updating user');
    }

    return data;
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-users?id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error deleting user');
    }

    return data;
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
}

/**
 * Get tour by ID (for editing)
 */
export async function getTourById(tourId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-tours?id=${tourId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error fetching tour');
    }

    return data;
  } catch (error) {
    console.error('Get tour by ID error:', error);
    throw error;
  }
}

/**
 * Update tour
 */
export async function updateTour(tourId, tourData) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin-tours?id=${tourId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tourData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error updating tour');
    }

    return data;
  } catch (error) {
    console.error('Update tour error:', error);
    throw error;
  }
}

/**
 * Export data to CSV
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle arrays and objects
        if (Array.isArray(value)) {
          return `"${value.join('; ')}"`;
        }
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value)}"`;
        }
        // Escape quotes and wrap in quotes
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

