/**
 * BlockRenderer - Component for rendering different types of content blocks
 */

import { useState, useEffect, useRef } from 'react';
import { PhotoCarousel, FullscreenPhotoViewer } from './PhotoCarousel';

// Alternative Location Photo Component - handles photo display for alternative locations
// NOTE: Clicking on photo should switch location, NOT open fullscreen
function AlternativeLocationPhoto({ altLocation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  const altPhotos = altLocation.photos || altLocation.photo || [];
  const altPhotosArray = Array.isArray(altPhotos) ? altPhotos : (altPhotos ? [altPhotos] : []);
  const currentPhoto = altPhotosArray[currentIndex] || altPhotosArray[0];
  
  const minSwipeDistance = 50;
  
  const onTouchStartHandler = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMoveHandler = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < altPhotosArray.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  if (altPhotosArray.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '59px',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '9px'
      }}>
        No photo
      </div>
    );
  }
  
  return (
    <div style={{ 
      width: '100%', 
      height: '59px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: 'pointer'
        }}
        onTouchStart={onTouchStartHandler}
        onTouchMove={onTouchMoveHandler}
        onTouchEnd={onTouchEndHandler}
        // NOTE: No onClick here - parent div handles location switching
      >
        <img 
          src={currentPhoto} 
          alt={altLocation.title || altLocation.name || 'Alternative location'} 
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            pointerEvents: 'none', // Prevent image click - let parent handle it
            userSelect: 'none'
          }}
          draggable={false}
          onError={(e) => {
            console.error('❌ Error loading alternative location photo:', currentPhoto, 'for location:', altLocation.title || altLocation.name);
            // Try to load next photo if available
            if (currentIndex < altPhotosArray.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              // If no more photos, show placeholder
              e.target.style.display = 'none';
            }
          }}
          onLoad={() => {
            console.log('✅ Loaded alternative location photo:', currentPhoto, 'for location:', altLocation.title || altLocation.name, 'index:', currentIndex);
          }}
        />
      </div>
      
      {/* Dots indicator for multiple photos */}
      {altPhotosArray.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          zIndex: 2,
          pointerEvents: 'none' // Don't interfere with parent click
        }}>
          {altPhotosArray.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? '6px' : '4px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: index === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlockRenderer({ block, onEdit, onSwitchLocation }) {
  if (!block) return null;

  switch (block.block_type) {
    case 'location':
      return <LocationBlock block={block} onEdit={onEdit} onSwitchLocation={onSwitchLocation} />;
    case 'title':
      return <TitleBlock block={block} onEdit={onEdit} />;
    case 'photo_text':
      return <PhotoTextBlock block={block} onEdit={onEdit} />;
    case 'text':
      return <TextBlock block={block} onEdit={onEdit} />;
    case 'slide':
      return <SlideBlock block={block} onEdit={onEdit} />;
    case '3columns':
      return <ThreeColumnsBlock block={block} onEdit={onEdit} />;
    case 'photo':
      return <PhotoBlock block={block} onEdit={onEdit} />;
    case 'divider':
      return <DividerBlock block={block} onEdit={onEdit} />;
    default:
      return <div>Unknown block type: {block.block_type}</div>;
  }
}

// Location Block
function LocationBlock({ block, onEdit, onSwitchLocation }) {
  const content = block.content || {};
  
  // Support both old format (flat) and new format (mainLocation + alternativeLocations)
  const mainLocation = content.mainLocation || content;
  const alternativeLocations = content.alternativeLocations || [];
  
  // Debug logging
  if (alternativeLocations.length > 0) {
    console.log('📍 LocationBlock - Alternative locations found:', {
      count: alternativeLocations.length,
      locations: alternativeLocations.map(alt => ({
        name: alt.name || alt.title,
        hasPhotos: !!(alt.photos || alt.photo),
        photosCount: (alt.photos || (alt.photo ? [alt.photo] : [])).length
      }))
    });
  } else {
    console.log('📍 LocationBlock - No alternative locations found in content:', {
      hasContent: !!content,
      hasMainLocation: !!content.mainLocation,
      contentKeys: Object.keys(content),
      alternativeLocations: content.alternativeLocations,
      alternatives: content.alternatives
    });
  }
  
  // Detect screen size for responsive layout
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreenPhotos, setFullscreenPhotos] = useState(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle photo click - open fullscreen viewer
  const handlePhotoClick = (photos, index) => {
    const photosArray = Array.isArray(photos) ? photos : [photos];
    setFullscreenPhotos(photosArray);
    setFullscreenIndex(index || 0);
  };
  
  // Handle switching between main and alternative locations
  const handleSwitchLocation = (alternativeIndex) => {
    if (!onSwitchLocation) {
      console.warn('onSwitchLocation callback not provided');
      return;
    }
    
    if (alternativeIndex < 0 || alternativeIndex >= alternativeLocations.length) {
      console.warn('Invalid alternative location index:', alternativeIndex);
      return;
    }
    
    const newMainLocation = alternativeLocations[alternativeIndex];
    const newAlternativeLocations = [...alternativeLocations];
    newAlternativeLocations[alternativeIndex] = mainLocation;
    
    // Update block content
    const updatedContent = {
      mainLocation: newMainLocation,
      alternativeLocations: newAlternativeLocations
    };
    
    console.log('Switching locations:', {
      oldMain: mainLocation.title,
      newMain: newMainLocation.title,
      updatedContent
    });
    
    onSwitchLocation({ ...block, content: updatedContent });
  };
  
  return (
    <div style={{ 
      marginBottom: isMobile ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
      {/* Time badge */}
      {mainLocation.time && (
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {mainLocation.time}
          </span>
        </div>
      )}

      {/* Main content: Photo and Details - 4-column grid (50/50 split) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '24px',
        marginBottom: '24px',
        alignItems: 'start'
      }}>
        {/* Photo - Left half */}
        <div>
          {(() => {
            // Normalize photos - support both array and single photo
            const mainPhotos = mainLocation.photos || (mainLocation.photo ? [mainLocation.photo] : []);
            const mainPhotosArray = Array.isArray(mainPhotos) ? mainPhotos : [mainPhotos];
            
            console.log('📍 Main location photos:', {
              hasPhotos: mainLocation.photos ? 'array' : (mainLocation.photo ? 'single' : 'none'),
              photosCount: mainPhotosArray.length,
              photos: mainPhotosArray
            });
            
            if (mainPhotosArray.length > 0) {
              return (
                <PhotoCarousel
                  photos={mainPhotosArray}
                  onPhotoClick={handlePhotoClick}
                />
              );
            } else {
              return (
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af'
                }}>
                  No photo
                </div>
              );
            }
          })()}
        </div>

        {/* Details - Right half */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%'
        }}>
          <div>
            {mainLocation.title && (
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '12px',
                color: '#111827',
                lineHeight: '1.2'
              }}>
                {mainLocation.place_id ? (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${mainLocation.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#111827',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      borderBottom: '1px solid transparent',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderBottomColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderBottomColor = 'transparent';
                    }}
                  >
                    {mainLocation.title}
                  </a>
                ) : mainLocation.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainLocation.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#111827',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      borderBottom: '1px solid transparent',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderBottomColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderBottomColor = 'transparent';
                    }}
                  >
                    {mainLocation.title}
                  </a>
                ) : (
                  mainLocation.title
                )}
              </h3>
            )}
            
            {mainLocation.address && (
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ef4444', fontSize: '16px' }}>📍</span>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainLocation.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6', 
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  {mainLocation.address}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {mainLocation.rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>⭐</span>
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                    {mainLocation.rating.toFixed(1)}
                  </span>
                  {mainLocation.user_ratings_total && (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      ({mainLocation.user_ratings_total})
                    </span>
                  )}
                </div>
              )}
              {mainLocation.price_level && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>💵</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {(() => {
                      const level = parseInt(mainLocation.price_level);
                      if (isNaN(level)) return `Price level: ${mainLocation.price_level}`;
                      const levels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
                      return levels[level] || `Level ${level}`;
                    })()}
                  </span>
                </div>
              )}
              {mainLocation.approx_cost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981', fontSize: '16px' }}>💰</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {mainLocation.approx_cost}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alternative Locations - aligned to bottom on desktop, hidden on mobile (will show after description) */}
          {!isMobile && alternativeLocations.length > 0 && (
            <div style={{ 
              marginTop: 'auto',
              paddingTop: '24px'
            }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px',
                color: '#111827'
              }}>
                Author also recommends
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(83px, 1fr))',
                gap: '8px'
              }}>
                {alternativeLocations.map((altLocation, index) => (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSwitchLocation(index);
                    }}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <AlternativeLocationPhoto 
                      altLocation={altLocation}
                    />
                    <div style={{ padding: '5px' }}>
                      <h5 style={{ 
                        fontSize: '10px', 
                        fontWeight: '600', 
                        marginBottom: '2px',
                        color: '#111827',
                        lineHeight: '1.2'
                      }}>
                        {altLocation.title || 'Alternative location'}
                      </h5>
                      {altLocation.price_level && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          <span style={{ color: '#f59e0b', fontSize: '8px' }}>⭐</span>
                          <span style={{ fontSize: '9px', color: '#6b7280' }}>
                            {altLocation.price_level}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {mainLocation.description && (
        <div style={{ marginBottom: '16px' }}>
          {mainLocation.description.split('\n\n').map((paragraph, index, array) => (
            <p 
              key={index}
              style={{ 
                fontSize: '16px', 
                lineHeight: '1.6', 
                color: '#374151',
                margin: 0,
                marginBottom: index < array.length - 1 ? '8px' : 0
              }}>
              {paragraph.trim()}
            </p>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {mainLocation.recommendations && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#111827'
          }}>
            Recommendations
          </h4>
          {mainLocation.recommendations.split('\n\n').map((paragraph, index, array) => (
            <p 
              key={index}
              style={{ 
                fontSize: '15px', 
                lineHeight: '1.6', 
                color: '#4b5563',
                margin: 0,
                marginBottom: index < array.length - 1 ? '8px' : 0
              }}>
              {paragraph.trim()}
            </p>
          ))}
        </div>
      )}

      {/* Alternative Locations - Mobile version: show after recommendations */}
      {isMobile && alternativeLocations.length > 0 && (
        <div style={{ 
          marginTop: '24px',
          marginBottom: '16px'
        }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#111827'
          }}>
            Author also recommends
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(83px, 1fr))',
            gap: '8px'
          }}>
            {alternativeLocations.map((altLocation, index) => (
              <div
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSwitchLocation(index);
                }}
                style={{
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <AlternativeLocationPhoto 
                  altLocation={altLocation}
                  onPhotoClick={(photos, index) => {
                    setFullscreenPhotos(photos);
                    setFullscreenIndex(index);
                  }}
                />
                <div style={{ padding: '5px' }}>
                  <h5 style={{ 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    marginBottom: '2px',
                    color: '#111827',
                    lineHeight: '1.2'
                  }}>
                    {altLocation.title || 'Alternative location'}
                  </h5>
                  {altLocation.price_level && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                      <span style={{ color: '#f59e0b', fontSize: '8px' }}>⭐</span>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>
                        {altLocation.price_level}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhotos && (
        <FullscreenPhotoViewer
          photos={fullscreenPhotos}
          initialIndex={fullscreenIndex}
          onClose={() => {
            setFullscreenPhotos(null);
            setFullscreenIndex(0);
          }}
        />
      )}
      </div>
    </div>
  );
}

// Title Block
function TitleBlock({ block, onEdit }) {
  const content = block.content || {};
  const text = content.text || 'Lorem ipsum dolor conta me more upsi colora';
  const size = content.size || 'large';
  
  const fontSizeMap = {
    small: '24px',
    medium: '32px',
    large: '48px'
  };

  const [isMobileTitle, setIsMobileTitle] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileTitle(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div style={{ 
      marginBottom: isMobileTitle ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        <h2 style={{
          fontSize: fontSizeMap[size],
          fontWeight: 'bold',
          color: '#111827',
          margin: 0,
          lineHeight: '1.2'
        }}>
          {text}
        </h2>
      </div>
    </div>
  );
}

// Photo + Text Block
function PhotoTextBlock({ block, onEdit }) {
  const content = block.content || {};
  const photos = content.photos || (content.photo ? [content.photo] : []);
  const text = content.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  const alignment = content.alignment || 'left';
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreenPhotos, setFullscreenPhotos] = useState(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle photo click - open fullscreen viewer
  const handlePhotoClick = (photosArray, index) => {
    if (photosArray.length > 0) {
      setFullscreenPhotos(photosArray);
      setFullscreenIndex(index || 0);
    }
  };

  // Swipe handlers for photo carousel
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
    if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  // Square aspect ratio (1:1) for all screen sizes
  const currentPhoto = photos[currentPhotoIndex] || photos[0];

  // Mobile: image first, then text below
  if (isMobile) {
    return (
      <div style={{ 
        marginBottom: '10px',
        padding: '0'
      }}>
        <div style={{
          padding: '0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              {currentPhoto ? (
                <>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onClick={() => handlePhotoClick(photos, currentPhotoIndex)}
                  >
                    <img 
                      src={currentPhoto} 
                      alt="Content" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        objectPosition: 'center',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                  </div>
                  
                  {/* Dots indicator */}
                  {photos.length > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '12px'
                    }}>
                      {photos.map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: index === currentPhotoIndex ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            backgroundColor: index === currentPhotoIndex ? '#3b82f6' : '#d1d5db',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhotoIndex(index);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af'
                }}>
                  No photo
                </div>
              )}
            </div>
            <div>
              {text.split('\n\n').map((paragraph, index, array) => (
                <p 
                  key={index}
                  style={{ 
                    color: '#111827', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: 0,
                    marginBottom: index < array.length - 1 ? '8px' : 0
                  }}>
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Fullscreen Photo Viewer */}
        {fullscreenPhotos && (
          <FullscreenPhotoViewer
            photos={fullscreenPhotos}
            initialIndex={fullscreenIndex}
            onClose={() => {
              setFullscreenPhotos(null);
              setFullscreenIndex(0);
            }}
          />
        )}
      </div>
    );
  }

  // Desktop: Grid 2 columns (photo 50%, text 50%) - like TextBlock
  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          alignItems: 'flex-start'
        }}>
          {/* Photo section - 50% width */}
          <div style={{ 
            order: alignment === 'right' ? 2 : 1
          }}>
            {currentPhoto ? (
              <>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePhotoClick(photos, currentPhotoIndex)}
                >
                  <img 
                    src={currentPhoto} 
                    alt="Content" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      objectPosition: 'center',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                </div>
                
                {/* Dots indicator */}
                {photos.length > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '12px'
                  }}>
                    {photos.map((_, index) => (
                      <div
                        key={index}
                        style={{
                          width: index === currentPhotoIndex ? '24px' : '8px',
                          height: '8px',
                          borderRadius: '4px',
                          backgroundColor: index === currentPhotoIndex ? '#3b82f6' : '#d1d5db',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(index);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af'
              }}>
                No photo
              </div>
            )}
          </div>
          
          {/* Text section - 50% width */}
          <div style={{ 
            order: alignment === 'right' ? 1 : 2
          }}>
            {text.split('\n\n').map((paragraph, index, array) => (
              <p 
                key={index}
                style={{ 
                  color: '#111827', 
                  fontSize: '16px', 
                  lineHeight: '1.6',
                  margin: 0,
                  marginBottom: index < array.length - 1 ? '8px' : 0
                }}>
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhotos && (
        <FullscreenPhotoViewer
          photos={fullscreenPhotos}
          initialIndex={fullscreenIndex}
          onClose={() => {
            setFullscreenPhotos(null);
            setFullscreenIndex(0);
          }}
        />
      )}
    </div>
  );
}

// Text Block
function TextBlock({ block, onEdit }) {
  const content = block.content || {};
  const layout = content.layout || 'single';
  const formatted = content.formatted || false;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (layout === 'two-columns') {
    const column1 = content.column1 || '';
    const column2 = content.column2 || '';
    
    return (
      <div style={{ 
        marginBottom: isMobile ? '10px' : '32px',
        padding: isMobile ? '0 10px' : '0'
      }}>
        <div style={{
          padding: isMobile ? '20px' : '0'
        }}>
          <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: isMobile ? '24px' : '32px',
        marginBottom: '24px'
      }}>
        <div>
          {formatted ? (
            <div 
              dangerouslySetInnerHTML={{ __html: column1 }}
              style={{ 
                color: '#111827', 
                fontSize: '16px', 
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}
            />
          ) : (
            <>
              {column1.split('\n\n').map((paragraph, index, array) => (
                <p 
                  key={index}
                  style={{ 
                    color: '#111827', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: 0,
                    marginBottom: index < array.length - 1 ? '8px' : 0
                  }}>
                  {paragraph.trim()}
                </p>
              ))}
            </>
          )}
        </div>
        <div>
          {formatted ? (
            <div 
              dangerouslySetInnerHTML={{ __html: column2 }}
              style={{ 
                color: '#111827', 
                fontSize: '16px', 
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}
            />
          ) : (
            <>
              {column2.split('\n\n').map((paragraph, index, array) => (
                <p 
                  key={index}
                  style={{
                    color: '#111827', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: 0,
                    marginBottom: index < array.length - 1 ? '8px' : 0
                  }}>
                  {paragraph.trim()}
                </p>
              ))}
            </>
          )}
        </div>
          </div>
        </div>
      </div>
    );
  }

  // Single column layout
  const text = content.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  return (
    <div style={{ 
      marginBottom: isMobile ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
      {formatted ? (
        <div 
          dangerouslySetInnerHTML={{ __html: text }}
          style={{ 
            color: '#111827', 
            fontSize: '16px', 
            lineHeight: '1.6' 
          }}
        />
      ) : (
        <>
          {text.split('\n\n').map((paragraph, index, array) => (
            <p 
              key={index}
              style={{ 
                color: '#111827', 
                fontSize: '16px', 
                lineHeight: '1.6',
                margin: 0,
                marginBottom: index < array.length - 1 ? '8px' : 0
              }}>
              {paragraph.trim()}
            </p>
          ))}
        </>
      )}
      </div>
    </div>
  );
}

// Slide Block
function SlideBlock({ block, onEdit }) {
  const content = block.content || {};
  const title = content.title || 'Slide Title';
  const photos = content.photos || (content.photo ? [content.photo] : []);
  const text = content.text || 'Slide description text';
  const [isMobileSlide, setIsMobileSlide] = useState(false);
  const [fullscreenPhotos, setFullscreenPhotos] = useState(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileSlide(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle photo click - open fullscreen viewer
  const handlePhotoClick = (photosArray, index) => {
    if (photosArray.length > 0) {
      setFullscreenPhotos(photosArray);
      setFullscreenIndex(index || 0);
    }
  };

  // Swipe handlers for photo carousel
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
    if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  // Fixed height: 400px (desktop) / 190px (mobile) - 750px × 400px on desktop
  const photoHeight = isMobileSlide ? '190px' : '400px';
  const currentPhoto = photos[currentPhotoIndex] || photos[0];

  return (
    <div style={{ 
      marginBottom: isMobileSlide ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
          {title}
        </h3>
        {currentPhoto ? (
          <>
            <div
              style={{
                width: '100%',
                height: photoHeight,
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={() => handlePhotoClick(photos, currentPhotoIndex)}
            >
              <img 
                src={currentPhoto} 
                alt={title} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  objectPosition: 'center',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            </div>
            
            {/* Dots indicator */}
            {photos.length > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '12px'
              }}>
                {photos.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: index === currentPhotoIndex ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: index === currentPhotoIndex ? '#3b82f6' : '#d1d5db',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(index);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%',
            height: photoHeight,
            borderRadius: '20px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            No photo
          </div>
        )}
        {text.split('\n\n').map((paragraph, index, array) => (
          <p 
            key={index}
            style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              lineHeight: '1.6', 
              margin: 0,
              marginBottom: index < array.length - 1 ? '8px' : 0
            }}>
            {paragraph.trim()}
          </p>
        ))}

        {/* Fullscreen Photo Viewer */}
        {fullscreenPhotos && (
          <FullscreenPhotoViewer
            photos={fullscreenPhotos}
            initialIndex={fullscreenIndex}
            onClose={() => {
              setFullscreenPhotos(null);
              setFullscreenIndex(0);
            }}
          />
        )}
      </div>
    </div>
  );
}

// 3 Columns Block
function ThreeColumnsBlock({ block, onEdit }) {
  const content = block.content || {};
  const columns = content.columns || [
    { photo: null, text: 'Column 1 text' },
    { photo: null, text: 'Column 2 text' },
    { photo: null, text: 'Column 3 text' }
  ];
  
  // Debug logging
  console.log('📸 ThreeColumnsBlock - Content:', {
    hasContent: !!content,
    hasColumns: !!content.columns,
    columnsCount: columns.length,
    columns: columns.map((col, idx) => ({
      index: idx,
      hasPhoto: !!col.photo,
      photo: col.photo || null,
      text: col.text
    }))
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile: horizontal scroll with swipe
  if (isMobile) {
    return (
      <div style={{ 
        marginBottom: '10px',
        padding: '0'
      }}>
        <div style={{
          padding: '0'
        }}>
          <div style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
        paddingBottom: '8px'
      }}
      onTouchStart={(e) => {
        // Enable smooth scrolling on touch devices
        e.currentTarget.style.scrollBehavior = 'smooth';
      }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
        <div style={{
          display: 'flex',
          gap: '16px',
          width: 'max-content',
          paddingRight: '16px'
        }}>
          {columns.map((column, index) => (
            <div 
              key={index}
              style={{
                // All images are 85% width to show part of next image and indicate scrollability
                flex: '0 0 calc(85vw - 64px)',
                maxWidth: 'calc(85vw - 64px)',
                scrollSnapAlign: 'start'
              }}
            >
              {column.photo ? (
                <img 
                  src={column.photo} 
                  alt={`Column ${index + 1}`} 
                  style={{ 
                    width: '100%', 
                    height: '200px', 
                    objectFit: 'cover', 
                    borderRadius: '20px',
                    marginBottom: '12px'
                  }} 
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '200px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '20px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '12px'
                }}>
                  No photo
                </div>
              )}
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px', 
                lineHeight: '1.6', 
                margin: 0,
                whiteSpace: 'pre-line'
              }}>
                {column.text}
              </p>
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: grid layout
  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          {columns.map((column, index) => (
            <div key={index}>
              {column.photo ? (
                <img 
                  src={column.photo} 
                  alt={`Column ${index + 1}`} 
                  style={{ 
                    width: '100%', 
                    height: '150px', 
                    objectFit: 'cover', 
                    borderRadius: '20px',
                    marginBottom: '12px'
                  }} 
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '20px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '12px'
                }}>
                  No photo
                </div>
              )}
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px', 
                lineHeight: '1.6', 
                margin: 0,
                whiteSpace: 'pre-line'
              }}>
                {column.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Photo Block
function PhotoBlock({ block, onEdit }) {
  const content = block.content || {};
  const photos = content.photos || (content.photo ? [content.photo] : []);
  const caption = content.caption || '';
  
  // Debug logging
  console.log('📸 PhotoBlock - Content:', {
    hasContent: !!content,
    hasPhotos: !!content.photos,
    hasPhoto: !!content.photo,
    photosCount: photos.length,
    photos: photos,
    caption: caption
  });
  const [isMobilePhoto, setIsMobilePhoto] = useState(false);
  const [fullscreenPhotos, setFullscreenPhotos] = useState(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobilePhoto(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle photo click - open fullscreen viewer
  const handlePhotoClick = (photosArray, index) => {
    if (photosArray.length > 0) {
      setFullscreenPhotos(photosArray);
      setFullscreenIndex(index || 0);
    }
  };

  // Swipe handlers for photo carousel
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
    if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  // Fixed height: 400px (desktop) / 190px (mobile) - 750px × 400px on desktop
  const photoHeight = isMobilePhoto ? '190px' : '400px';
  const currentPhoto = photos[currentPhotoIndex] || photos[0];

  return (
    <div style={{ 
      marginBottom: isMobilePhoto ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        {currentPhoto ? (
        <>
          <div
            style={{
              width: '100%',
              height: photoHeight,
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              marginBottom: caption ? '12px' : 0
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={() => handlePhotoClick(photos, currentPhotoIndex)}
          >
            <img 
              src={currentPhoto} 
              alt="Content" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                objectPosition: 'center',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
              draggable={false}
            />
          </div>
          
          {/* Dots indicator */}
          {photos.length > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: caption ? '12px' : 0
            }}>
              {photos.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: index === currentPhotoIndex ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: index === currentPhotoIndex ? '#3b82f6' : '#d1d5db',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(index);
                  }}
                />
              ))}
            </div>
          )}
          
          {caption && (
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              fontStyle: 'italic',
              textAlign: 'center',
              margin: 0,
              lineHeight: '1.6',
              whiteSpace: 'pre-line'
            }}>
              {caption}
            </p>
          )}
        </>
      ) : (
        <div style={{
          width: '100%',
          height: photoHeight,
          backgroundColor: '#e5e7eb',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }}>
          No photo
        </div>
      )}

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhotos && (
        <FullscreenPhotoViewer
          photos={fullscreenPhotos}
          initialIndex={fullscreenIndex}
          onClose={() => {
            setFullscreenPhotos(null);
            setFullscreenIndex(0);
          }}
        />
      )}
      </div>
    </div>
  );
}

// Divider Block
function DividerBlock({ block, onEdit }) {
  const content = block.content || {};
  const style = content.style || 'solid';
  const [isMobileDivider, setIsMobileDivider] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileDivider(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const borderStyleMap = {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted'
  };

  return (
    <div style={{ 
      marginBottom: isMobileDivider ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
        <div style={{ position: 'relative' }}>
      <hr style={{
        border: 'none',
        borderTop: `1px ${borderStyleMap[style]} #e5e7eb`,
        margin: 0
      }} />
      {/* Invisible white area below the line for easier hover interaction */}
      <div style={{
        position: 'absolute',
        top: '1px',
        left: 0,
        right: 0,
        height: '30px',
        backgroundColor: 'white',
        pointerEvents: 'auto',
        zIndex: 0
      }} />
        </div>
      </div>
    </div>
  );
}

