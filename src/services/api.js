import axios from 'axios';

// Автоматическое определение API URL для разных окружений
const getApiBaseUrl = () => {
  // Если указана переменная окружения, используем её
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', ''); // Убираем /api из конца
  }
  
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // В продакшене используем backend URL  
  if (import.meta.env.PROD) {
    return 'https://fliptripback.vercel.app'; // New Clean Backend URL
  }
  
  // В разработке используем localhost
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Generate preview with title and subtitle
export const generatePreview = async (formData) => {
  try {
    const response = await api.post('/api/generate-preview', {
      city: formData.city,
      audience: formData.audience,
      interests: formData.interests,
      date: formData.date,
      budget: formData.budget,
    });
    return response.data;
  } catch (error) {
    console.error('Preview generation error:', error);
    throw error;
  }
};

// Generate full itinerary after payment
export const generateItinerary = async (formData) => {
  try {
    const response = await api.post('/api/generate-itinerary', formData);
    return response.data;
  } catch (error) {
    console.error('Itinerary generation error:', error);
    throw error;
  }
};

// Generate smart itinerary with budget optimization
export const generateSmartItinerary = async (formData) => {
  try {
    const response = await api.post('/api/smart-itinerary', formData);
    return response.data;
  } catch (error) {
    console.error('Smart itinerary generation error:', error);
    throw error;
  }
};

// Generate smart itinerary v2 with new architecture
export const generateSmartItineraryV2 = async (formData) => {
  try {
    const response = await api.post('/api/smart-itinerary-v2', formData);
    return response.data;
  } catch (error) {
    console.error('Smart itinerary v2 generation error:', error);
    throw error;
  }
};

// Generate creative itinerary - НОВАЯ АРХИТЕКТУРА
export const generateCreativeItinerary = async (formData) => {
  try {
    console.log('🎨 Generating creative itinerary with:', formData);
    const response = await api.post('/api/creative-itinerary', formData);
    console.log('✅ Creative itinerary response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Creative itinerary generation error:', error);
    throw error;
  }
};

// Generate real places itinerary - используем РАБОТАЮЩИЙ smart-itinerary API
export const generateRealPlacesItinerary = async (formData) => {
  try {
    console.log('🌍 Using working smart-itinerary API:', formData);
    
    // Используем РАБОЧИЙ API smart-itinerary
    const response = await api.post('/api/smart-itinerary', formData);
    console.log('✅ Smart itinerary response:', response.data);
    
    // Конвертируем ответ в нужную структуру daily_plan
    const smartData = response.data;
    const convertedData = {
      title: smartData.title || `Epic amazing discoveries in ${formData.city}`,
      subtitle: smartData.subtitle || `${formData.date} for ${formData.audience} - discover the magic of ${formData.city}`,
      date: smartData.date || formData.date,
      budget: smartData.budget || formData.budget,
      weather: smartData.weather || {
        forecast: `Perfect weather for exploring ${formData.city}`,
        clothing: 'Comfortable walking shoes and light layers',
        tips: 'Stay hydrated and bring a camera!'
      },
      daily_plan: [{
        date: smartData.date || formData.date,
        blocks: smartData.activities ? smartData.activities.map(activity => ({
          time: activity.time,
          items: [{
            title: activity.name || activity.title,
            why: activity.description, // Frontend ожидает 'why' для описания
            description: activity.description,
            category: activity.category,
            duration: activity.duration,
            price: activity.price,
            location: activity.location || `${formData.city} City Center`,
            address: activity.location || `${formData.city} City Center`,
            photos: activity.photos ? activity.photos.map(photoUrl => ({
              url: photoUrl,
              thumbnail: photoUrl.replace('maxwidth=800', 'maxwidth=200'), // Создаем thumbnail
              source: photoUrl.includes('googleapis.com') ? 'google_places' : 'unsplash'
            })) : [{
              url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop&q=80',
              thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=150&fit=crop&q=80',
              source: 'unsplash'
            }],
            tips: activity.recommendations || `Perfect for ${formData.audience}. Enjoy the experience!`, // Frontend ожидает 'tips'
            approx_cost: activity.priceRange || `${activity.price}€`, // Frontend ожидает 'approx_cost'
            rating: activity.rating || 4.0
          }]
        })) : []
      }],
      totalCost: smartData.totalCost || 0,
      withinBudget: smartData.withinBudget || true
    };
    
    console.log('✅ Converted to daily_plan structure:', convertedData);
    return convertedData;
    
  } catch (error) {
    console.error('❌ Smart itinerary API failed:', error);
    throw error;
  }
};

// Generate PDF
export const generatePDF = async (itinerary) => {
  try {
    // For now, return mock PDF data
    // In real implementation, this would call the PDF API
    return new Blob(['Mock PDF content'], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

// Create Stripe checkout session
export const createCheckoutSession = async (formData) => {
  try {
    const response = await api.post('/api/create-checkout-session', formData);
    return response.data;
  } catch (error) {
    console.error('Checkout session creation error:', error);
    throw error;
  }
};

// Send email with itinerary
export const sendEmail = async (emailData) => {
  try {
    console.log('📧 Sending email with:', emailData);
    const response = await api.post('/api/send-email', emailData);
    console.log('✅ Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Get examples list
export const getExamples = async () => {
  try {
    const response = await api.get('/api/examples');
    return response.data;
  } catch (error) {
    console.error('Error getting examples:', error);
    throw error;
  }
};

// Get specific example
export const getExample = async (exampleId) => {
  try {
    const response = await api.get(`/api/examples/${exampleId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting example:', error);
    throw error;
  }
};

// Save itinerary to Redis
export const saveItinerary = async (itinerary, itineraryId = null) => {
  try {
    const response = await api.post('/api/save-itinerary', {
      itinerary,
      itineraryId
    });
    return response.data;
  } catch (error) {
    console.error('Error saving itinerary:', error);
    throw error;
  }
};

// Get itinerary from Redis
export const getItinerary = async (itineraryId) => {
  try {
    const response = await api.get(`/api/get-itinerary?id=${itineraryId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting itinerary:', error);
    throw error;
  }
};

// Complete itinerary after payment (generate remaining locations)
// Unlock itinerary (simply update previewOnly flag to false)
export const unlockItinerary = async (itineraryId) => {
  try {
    const response = await api.post('/api/unlock-itinerary', {
      itineraryId
    });
    return response.data;
  } catch (error) {
    console.error('Unlock itinerary error:', error);
    throw error;
  }
};

export const completeItinerary = async (itineraryId, formData) => {
  try {
    const response = await api.post('/api/complete-itinerary', {
      itineraryId,
      city: formData.city,
      audience: formData.audience,
      interests: formData.interests,
      date: formData.date,
      budget: formData.budget
    });
    return response.data;
  } catch (error) {
    console.error('Complete itinerary error:', error);
    throw error;
  }
};

// Get tours from database with filters
export const getTours = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.city) params.append('city', filters.city);
    if (filters.interests && filters.interests.length > 0) {
      params.append('interests', filters.interests.join(','));
    }
    if (filters.format) params.append('format', filters.format);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await api.get(`/api/tours?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error getting tours:', error);
    throw error;
  }
};

export default api;
