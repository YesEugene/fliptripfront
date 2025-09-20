import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ExampleTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

  // Extract predefined trip data from URL params
  const tripData = {
    city: searchParams.get('city') || 'Paris',
    audience: searchParams.get('audience') || 'her',
    interests: searchParams.get('interests')?.split(',') || ['spa', 'relaxation'],
    budget: searchParams.get('budget') || '500',
    date: new Date().toISOString().slice(0, 10)
  };

  useEffect(() => {
    generateExampleItinerary();
  }, []);

  const generateExampleItinerary = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/smart-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: tripData.city,
          audience: tripData.audience,
          interests: tripData.interests,
          budget: tripData.budget,
          date: tripData.date
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(data);
      } else {
        setError('Failed to generate itinerary');
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      setError('Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itinerary,
          formData: tripData
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fliptrip-example-${tripData.city}-${tripData.date}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('PDF generation failed');
        alert('Failed to generate PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleCreateYourOwn = () => {
    // Navigate back to homepage to create custom trip
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f4f7f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            marginBottom: '16px',
            color: '#e11d48'
          }}>
            ⏳
          </div>
          <p style={{ 
            fontSize: '18px', 
            color: '#374151',
            margin: 0
          }}>
            Creating your example trip...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f4f7f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: '18px', 
            color: '#ef4444',
            margin: 0
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#e11d48',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7f6' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #e11d48 0%, #ff6b6b 100%)',
        color: 'white',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          marginBottom: '10px', 
          fontWeight: 'bold',
          margin: 0
        }}>
          {itinerary.meta.creative_title}
        </h1>
        <p style={{ 
          fontSize: '18px', 
          opacity: 0.9, 
          lineHeight: '1.5',
          margin: '10px 0 20px 0'
        }}>
          {itinerary.meta.creative_subtitle}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginTop: '20px'
        }}>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            🌍 {tripData.city}
          </span>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            📅 {tripData.date}
          </span>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            For: {tripData.audience}
          </span>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            Budget: {itinerary.meta.total_estimated_cost || `${tripData.budget}€`}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={handleDownloadPDF}
          style={{
            backgroundColor: '#e11d48',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '16px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#be185d'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#e11d48'}
        >
          📄 Download PDF
        </button>
        <button
          onClick={handleCreateYourOwn}
          style={{
            backgroundColor: 'transparent',
            color: '#e11d48',
            border: '2px solid #e11d48',
            borderRadius: '12px',
            padding: '12px 26px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#e11d48';
            e.target.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#e11d48';
          }}
        >
          ✨ Create Your Own
        </button>
      </div>

      {/* Weather Block */}
      {itinerary.meta.weather && itinerary.meta.clothing_advice && (
        <div style={{
          backgroundColor: '#e0f7fa',
          borderLeft: '4px solid #00bcd4',
          padding: '20px',
          margin: '20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{ fontSize: '36px' }}>☀️</div>
          <div style={{ fontSize: '15px', color: '#006064', lineHeight: '1.5' }}>
            {itinerary.meta.weather.description}<br/>
            {itinerary.meta.clothing_advice}
          </div>
        </div>
      )}

      {/* Day Plan */}
      <div style={{ padding: '20px' }}>
        <h2 style={{
          fontSize: '28px',
          color: '#e11d48',
          marginBottom: '25px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          Your Day Plan
        </h2>
        
        {itinerary.daily_plan[0].blocks.map((block, blockIndex) => (
          <div key={blockIndex} style={{
            backgroundColor: '#fdfdfd',
            border: '1px solid #eee',
            borderRadius: '12px',
            marginBottom: '20px',
            padding: '20px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#e11d48',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ⏰ {block.time}
            </div>
            {block.items.map((item, itemIndex) => (
              <div key={itemIndex}>
                <h3 style={{
                  fontSize: '20px',
                  color: '#333',
                  marginBottom: '8px',
                  fontWeight: 'bold'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '15px',
                  color: '#555',
                  lineHeight: '1.6',
                  marginBottom: '10px'
                }}>
                  {item.why}
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '15px',
                  marginTop: '15px'
                }}>
                  {item.address && (
                    <span style={{
                      background: '#f0f4f7',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📍 {item.address}
                    </span>
                  )}
                  {item.approx_cost && (
                    <span style={{
                      background: '#f0f4f7',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      💰 {item.approx_cost}
                    </span>
                  )}
                  {item.duration && (
                    <span style={{
                      background: '#f0f4f7',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      ⏳ {item.duration}
                    </span>
                  )}
                </div>
                {item.tips && (
                  <div style={{
                    background: '#fff3e0',
                    borderLeft: '4px solid #ff9800',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    marginTop: '15px',
                    fontSize: '14px',
                    color: '#664300'
                  }}>
                    💡 {item.tips}
                  </div>
                )}
                {item.photos && item.photos.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '10px',
                    marginTop: '15px'
                  }}>
                    {item.photos.map((photo, photoIndex) => (
                      <img
                        key={photoIndex}
                        src={photo}
                        alt="Location photo"
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #eee'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        color: '#9ca3af',
        fontSize: '14px',
        padding: '20px'
      }}>
        <p>Created with ❤️ in FlipTrip</p>
      </div>
    </div>
  );
}