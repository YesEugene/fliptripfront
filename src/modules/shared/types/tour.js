/**
 * Единый формат данных тура для всей системы
 * Используется во всех модулях для обеспечения совместимости
 */

export const TourFormat = {
  SELF_GUIDED: 'self-guided',
  GUIDED: 'guided',
  FOOD: 'food',
  CAR: 'car'
};

export const TourDurationType = {
  HOURS: 'hours',
  DAYS: 'days'
};

export const TourAudience = {
  HIM: 'him',
  HER: 'her',
  COUPLES: 'couples',
  KIDS: 'kids'
};

/**
 * @typedef {Object} Tour
 * @property {string} id - Уникальный идентификатор тура
 * @property {string} guideId - ID гида, создавшего тур
 * @property {string} title - Название тура
 * @property {string} city - Город тура
 * @property {Object} duration - Длительность тура
 * @property {string} duration.type - Тип длительности (hours/days)
 * @property {number} duration.value - Значение длительности
 * @property {string[]} languages - Языки тура
 * @property {string} format - Формат тура (self-guided/guided/food/car)
 * @property {Object} price - Цена тура
 * @property {number} price.amount - Сумма
 * @property {string} price.currency - Валюта
 * @property {string} price.format - Формат продажи (pdf/guided/premium)
 * @property {Array} daily_plan - План по дням
 * @property {Object} meta - Метаданные тура
 * @property {string[]} meta.interests - Интересы
 * @property {string} meta.audience - Аудитория
 * @property {string} meta.total_estimated_cost - Общая стоимость
 * @property {Object} meta.weather - Погода
 * @property {string} createdAt - Дата создания
 * @property {string} updatedAt - Дата обновления
 */

/**
 * Валидация структуры тура
 * @param {Object} tour - Объект тура для валидации
 * @returns {boolean} - true если структура валидна
 */
export function validateTourStructure(tour) {
  const requiredFields = [
    'id',
    'guideId',
    'title',
    'city',
    'duration',
    'daily_plan',
    'meta'
  ];

  for (const field of requiredFields) {
    if (!tour[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Проверка структуры daily_plan
  if (!Array.isArray(tour.daily_plan) || tour.daily_plan.length === 0) {
    console.error('daily_plan must be a non-empty array');
    return false;
  }

  // Проверка структуры blocks
  for (const day of tour.daily_plan) {
    if (!day.blocks || !Array.isArray(day.blocks)) {
      console.error('Each day must have blocks array');
      return false;
    }
  }

  return true;
}

/**
 * Преобразование тура в единый формат
 * @param {Object} tourData - Данные тура
 * @returns {Tour} - Нормализованный тур
 */
export function normalizeTour(tourData) {
  return {
    id: tourData.id || `tour-${Date.now()}`,
    guideId: tourData.guideId || null,
    title: tourData.title || '',
    city: tourData.city || '',
    duration: {
      type: tourData.duration?.type || TourDurationType.HOURS,
      value: tourData.duration?.value || 6
    },
    languages: tourData.languages || ['en'],
    format: tourData.format || TourFormat.SELF_GUIDED,
    price: {
      amount: tourData.price?.amount || 0,
      currency: tourData.price?.currency || 'EUR',
      format: tourData.price?.format || 'pdf'
    },
    daily_plan: tourData.daily_plan || [],
    meta: {
      interests: tourData.meta?.interests || [],
      audience: tourData.meta?.audience || TourAudience.HIM,
      total_estimated_cost: tourData.meta?.total_estimated_cost || '€0',
      weather: tourData.meta?.weather || null
    },
    createdAt: tourData.createdAt || new Date().toISOString(),
    updatedAt: tourData.updatedAt || new Date().toISOString()
  };
}

