import React, { useEffect, useRef, useState } from 'react';

const RouteMap = ({ places, city }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('RouteMap useEffect - places:', places, 'city:', city);
    console.log('Places count:', places?.length);
    console.log('City:', city);
    
    if (!places || places.length === 0) {
      console.log('No places provided, setting loading to false');
      setIsLoading(false);
      return;
    }

    // Проверяем, есть ли у мест координаты
    const placesWithCoords = places.filter(place => place.lat && place.lng);
    console.log('Places with coordinates:', placesWithCoords.length);
    console.log('Sample place with coords:', placesWithCoords[0]);

    // Загружаем Google Maps API
    const loadGoogleMaps = () => {
      console.log('Loading Google Maps API...');
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        initializeMap();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
      console.log('Environment variable VITE_GOOGLE_MAPS_KEY:', import.meta.env.VITE_GOOGLE_MAPS_KEY);
      console.log('Using API key:', apiKey.substring(0, 10) + '...');
      console.log('Full API key length:', apiKey.length);
      console.log('API key starts with:', apiKey.substring(0, 20));
      console.log('Script URL:', `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`);
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        initializeMap();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        setError('Failed to load Google Maps API. Please check your API key.');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      console.log('Initializing map...');
      console.log('Google Maps available:', !!window.google);
      console.log('Google Maps object:', window.google);
      console.log('Map ref:', mapRef.current);
      
      // Добавляем небольшую задержку для рендеринга
      setTimeout(() => {
        if (!mapRef.current) {
          console.log('Map ref not available after timeout');
          setError('Map container not found');
          setIsLoading(false);
          return;
        }
        
        console.log('Map ref found, proceeding with map creation');
        createMap();
      }, 100);
    };

    const createMap = () => {
      if (!window.google || !window.google.maps) {
        console.log('Google Maps not loaded');
        setError('Google Maps not loaded');
        setIsLoading(false);
        return;
      }

      try {
        // Определяем центр карты в зависимости от города
        const cityCenters = {
          'Moscow': { lat: 55.7558, lng: 37.6176 },
          'Barcelona': { lat: 41.3851, lng: 2.1734 },
          'Lisbon': { lat: 38.7223, lng: -9.1393 },
          'Paris': { lat: 48.8566, lng: 2.3522 },
          'Rome': { lat: 41.9028, lng: 12.4964 },
          'Venice': { lat: 45.4408, lng: 12.3155 },
          'Amsterdam': { lat: 52.3676, lng: 4.9041 },
          'Prague': { lat: 50.0755, lng: 14.4378 },
          'Berlin': { lat: 52.5200, lng: 13.4050 },
          'Vienna': { lat: 48.2082, lng: 16.3738 }
        };

        const center = cityCenters[city] || cityCenters['Moscow'];
        console.log('Map center for', city, ':', center);

        // Создаем карту
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: center,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        console.log('Map created successfully');
        mapInstanceRef.current = map;

        // Получаем координаты мест и рисуем маршрут
        processPlacesAndDrawRoute(map, places);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    const processPlacesAndDrawRoute = (map, places) => {
      const geocoder = new window.google.maps.Geocoder();
      const placesWithCoords = [];
      let processedCount = 0;

      places.forEach((place, index) => {
        if (place.lat && place.lng) {
          // Используем существующие координаты
          const location = new window.google.maps.LatLng(place.lat, place.lng);
          placesWithCoords.push({
            ...place,
            position: location,
            order: index
          });
          console.log(`Using existing coordinates for ${place.title}:`, place.lat, place.lng);
          processedCount++;
          if (processedCount === places.length) {
            drawRoute(map, placesWithCoords);
          }
        } else {
          // Fallback к геокодированию, если координат нет
          geocoder.geocode({ address: place.address }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const location = results[0].geometry.location;
              placesWithCoords.push({
                ...place,
                position: location,
                order: index
              });
              console.log(`Geocoded ${place.title}:`, location.lat(), location.lng());
            } else {
              console.warn(`Geocoding failed for ${place.title}:`, status);
            }
            processedCount++;
            if (processedCount === places.length) {
              drawRoute(map, placesWithCoords);
            }
          });
        }
      });
    };

    const drawRoute = (map, placesWithCoords) => {
      console.log('Drawing route with places:', placesWithCoords);
      if (placesWithCoords.length === 0) {
        console.log('No places with coordinates to draw');
        return;
      }

      // Сортируем места по порядку
      placesWithCoords.sort((a, b) => a.order - b.order);
      console.log('Sorted places:', placesWithCoords);

      // Создаем маркеры для каждого места
      const markers = placesWithCoords.map((place, index) => {
        const marker = new window.google.maps.Marker({
          position: place.position,
          map: map,
          title: `${index + 1}. ${place.title}`,
          label: {
            text: (index + 1).toString(),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          },
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(30, 30)
          }
        });

        // Информационное окно
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #333;">${place.title}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${place.address}</p>
              <p style="margin: 0; color: #888; font-size: 11px;">Stop ${index + 1}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        return marker;
      });

      // Создаем маршрут между точками
      if (placesWithCoords.length > 1) {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });

        directionsRenderer.setMap(map);

        // Строим маршрут пошагово
        let currentIndex = 0;
        const buildRoute = () => {
          if (currentIndex >= placesWithCoords.length - 1) return;

          const origin = placesWithCoords[currentIndex].position;
          const destination = placesWithCoords[currentIndex + 1].position;

          directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: window.google.maps.TravelMode.WALKING
          }, (result, status) => {
            if (status === 'OK') {
              directionsRenderer.setDirections(result);
            }
            currentIndex++;
            if (currentIndex < placesWithCoords.length - 1) {
              setTimeout(buildRoute, 500);
            }
          });
        };

        buildRoute();
      }

      // Центрируем карту на всех точках
      const bounds = new window.google.maps.LatLngBounds();
      placesWithCoords.forEach(place => {
        bounds.extend(place.position);
      });
      map.fitBounds(bounds);
    };

    loadGoogleMaps();

    return () => {
      // Очистка при размонтировании
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [places, city]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        fontSize: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <div>Map unavailable</div>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        fontSize: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div>Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '400px',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%' 
        }} 
      />
      <div style={{ fontSize: '12px', color: '#666', marginTop: '10px', padding: '10px', borderTop: '1px solid #eee' }}>
        <p>Map Status: {isLoading ? 'Loading...' : error ? `Error: ${error}` : 'Loaded'}</p>
        <p>API Key: {import.meta.env.VITE_GOOGLE_MAPS_KEY ? import.meta.env.VITE_GOOGLE_MAPS_KEY.substring(0, 5) + '...' + import.meta.env.VITE_GOOGLE_MAPS_KEY.substring(import.meta.env.VITE_GOOGLE_MAPS_KEY.length - 5) : 'Not set'}</p>
        <p>City: {city}</p>
        <p>Places with coordinates: {places?.filter(p => p.lat && p.lng).length || 0}</p>
        {places?.filter(p => p.lat && p.lng).map((p, i) => (
          <p key={i}>- {p.title} ({p.lat}, {p.lng})</p>
        ))}
      </div>
    </div>
  );
};

export default RouteMap;
