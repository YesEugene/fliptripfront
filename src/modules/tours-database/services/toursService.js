/**
 * Tours Database Module - Service Layer
 * Сервис для работы с турами
 */

// Автоматическое определение API URL
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
 * Получение токена авторизации
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Создание тура (только для гидов)
 * @param {Object} tourData - Данные тура
 * @returns {Promise<Object>} - Созданный тур
 */
export async function createTour(tourData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${API_BASE_URL}/api/tours-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tourData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка создания тура');
    }

    return data;
  } catch (error) {
    console.error('Create tour error:', error);
    throw error;
  }
}

/**
 * Получение списка туров с фильтрами
 * @param {Object} filters - Параметры фильтрации
 * @returns {Promise<Object>} - Список туров
 */
export async function getTours(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.format) queryParams.append('format', filters.format);
    if (filters.interests) {
      const interests = Array.isArray(filters.interests) 
        ? filters.interests.join(',') 
        : filters.interests;
      queryParams.append('interests', interests);
    }
    if (filters.audience) queryParams.append('audience', filters.audience);
    if (filters.duration) queryParams.append('duration', filters.duration);
    if (filters.languages) {
      const languages = Array.isArray(filters.languages) 
        ? filters.languages.join(',') 
        : filters.languages;
      queryParams.append('languages', languages);
    }
    if (filters.minPrice !== undefined) queryParams.append('minPrice', filters.minPrice);
    if (filters.maxPrice !== undefined) queryParams.append('maxPrice', filters.maxPrice);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);

    const response = await fetch(`${API_BASE_URL}/api/tours?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка получения туров');
    }

    return data;
  } catch (error) {
    console.error('Get tours error:', error);
    throw error;
  }
}

/**
 * Получение тура по ID
 * @param {string} tourId - ID тура
 * @returns {Promise<Object>} - Данные тура
 */
export async function getTourById(tourId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tours?id=${tourId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Тур не найден');
    }

    return data.tour;
  } catch (error) {
    console.error('Get tour error:', error);
    throw error;
  }
}

/**
 * Получение туров гида
 * @returns {Promise<Object>} - Список туров гида
 */
export async function getGuideTours() {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-tours`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка получения туров');
    }

    return data;
  } catch (error) {
    console.error('Get guide tours error:', error);
    throw error;
  }
}

/**
 * Обновление тура (только для гидов, только свои туры)
 * @param {string} tourId - ID тура для обновления
 * @param {Object} tourData - Обновленные данные тура
 * @returns {Promise<Object>} - Обновленный тур
 */
export async function updateTour(tourId, tourData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${API_BASE_URL}/api/tours-update?id=${tourId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tourData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка обновления тура');
    }

    return data;
  } catch (error) {
    console.error('Update tour error:', error);
    throw error;
  }
}

/**
 * Удаление тура (только для гидов, только свои туры)
 * @param {string} tourId - ID тура для удаления
 * @returns {Promise<Object>} - Результат удаления
 */
export async function deleteTour(tourId) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${API_BASE_URL}/api/tours-update?id=${tourId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка удаления тура');
    }

    return data;
  } catch (error) {
    console.error('Delete tour error:', error);
    throw error;
  }
}

