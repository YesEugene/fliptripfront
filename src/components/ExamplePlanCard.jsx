import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExample } from '../services/api';
import PhotoGallery from './PhotoGallery';
import './ExamplePlanCard.css';

const ExamplePlanCard = ({ exampleId, city, interests, audience, image }) => {
  const [exampleData, setExampleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadExample = async () => {
      try {
        setLoading(true);
        const response = await getExample(exampleId);
        setExampleData(response.example);
      } catch (err) {
        console.error('Error loading example:', err);
        setError('Failed to load example');
      } finally {
        setLoading(false);
      }
    };

    loadExample();
  }, [exampleId]);

  const handleCardClick = () => {
    if (exampleData) {
      // Navigate to itinerary page with example data
      navigate('/itinerary', { 
        state: { 
          itinerary: exampleData,
          isExample: true 
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="example-card loading">
        <div className="loading-spinner"></div>
        <p>Loading example...</p>
      </div>
    );
  }

  if (error || !exampleData) {
    return (
      <div className="example-card error">
        <p>Failed to load example</p>
      </div>
    );
  }

  // Get first few activities for preview
  const previewActivities = exampleData.daily_plan?.[0]?.blocks?.slice(0, 3) || [];

  return (
    <div className="example-card" onClick={handleCardClick}>
      {/* Header with city image */}
      <div className="example-card-header">
        <img src={image} alt={city} className="city-image" />
        <div className="example-card-overlay">
          <h3 className="example-card-title">{exampleData.title}</h3>
          <p className="example-card-subtitle">{exampleData.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="example-card-content">
        {/* Tags */}
        <div className="example-tags">
          <span className="tag city">{city}</span>
          <span className="tag audience">{audience}</span>
          {interests.map((interest, index) => (
            <span key={index} className="tag interest">{interest}</span>
          ))}
        </div>

        {/* Weather preview */}
        {exampleData.weather && (
          <div className="example-weather">
            <div className="weather-icon">🌤️</div>
            <div className="weather-temp">26°C</div>
            <div className="weather-desc">{exampleData.weather.forecast}</div>
          </div>
        )}

        {/* Activities preview */}
        <div className="example-activities">
          <h4>Day Plan Preview</h4>
          {previewActivities.map((block, index) => (
            <div key={index} className="activity-preview">
              <div className="activity-time">{block.time}</div>
              <div className="activity-title">
                {block.items?.[0]?.title || 'Activity'}
              </div>
            </div>
          ))}
          {previewActivities.length < exampleData.daily_plan?.[0]?.blocks?.length && (
            <div className="more-activities">
              +{exampleData.daily_plan[0].blocks.length - previewActivities.length} more activities
            </div>
          )}
        </div>

        {/* Photos preview */}
        {previewActivities[0]?.items?.[0]?.photos && (
          <div className="example-photos">
            <PhotoGallery 
              photos={previewActivities[0].items[0].photos.slice(0, 3)} 
              placeName={previewActivities[0].items[0].title}
              isPreview={true}
            />
          </div>
        )}

        {/* CTA */}
        <div className="example-cta">
          <button className="view-full-plan-btn">
            View Full Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamplePlanCard;
