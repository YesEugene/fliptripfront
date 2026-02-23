/**
 * BlockRenderer - Component for rendering different types of content blocks
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { PhotoCarousel, FullscreenPhotoViewer } from './PhotoCarousel';

/**
 * Refresh Google Places photo URL with current frontend API key.
 * Old photos may contain an expired/rotated backend key — this replaces it.
 */
function refreshPhotoUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Only process Google Maps photo URLs
  if (!url.includes('maps.googleapis.com/maps/api/place/photo')) return url;
  const frontendKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!frontendKey) return url;
  // Replace the key parameter with the current frontend key
  return url.replace(/([?&])key=[^&]+/, `$1key=${frontendKey}`);
}

/** Apply refreshPhotoUrl to an array of photo URLs */
function refreshPhotoUrls(photos) {
  if (!photos) return photos;
  if (Array.isArray(photos)) return photos.map(refreshPhotoUrl);
  return refreshPhotoUrl(photos);
}

// Alternative Location Photo Component - handles photo display for alternative locations
// NOTE: Clicking on photo should switch location, NOT open fullscreen
function AlternativeLocationPhoto({ altLocation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  const altPhotos = altLocation.photos || altLocation.photo || [];
  const altPhotosArray = Array.isArray(altPhotos) ? altPhotos : (altPhotos ? [altPhotos] : []);
  // Filter out invalid photos (must be valid HTTP URLs or base64 data URIs) and refresh API keys
  const validAltPhotos = altPhotosArray
    .filter(p => p && typeof p === 'string' && (p.startsWith('http') || p.startsWith('data:image/')))
    .map(refreshPhotoUrl);
  const currentPhoto = validAltPhotos[currentIndex] || validAltPhotos[0];
  
  // Debug logging
  useEffect(() => {
    if (altPhotosArray.length > 0) {
      console.log('🖼️ AlternativeLocationPhoto - Photos loaded:', {
        locationName: altLocation.title || altLocation.name,
        photosCount: altPhotosArray.length,
        currentIndex,
        currentPhoto: currentPhoto?.substring(0, 100) // Log first 100 chars of URL
      });
    } else {
      console.warn('⚠️ AlternativeLocationPhoto - No photos found:', {
        locationName: altLocation.title || altLocation.name,
        hasPhotos: !!altLocation.photos,
        hasPhoto: !!altLocation.photo,
        photos: altLocation.photos,
        photo: altLocation.photo
      });
    }
  }, [altLocation, validAltPhotos.length, currentIndex, currentPhoto]);
  
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
    
    if (isLeftSwipe && currentIndex < validAltPhotos.length - 1) {
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
      overflow: 'hidden',
      backgroundColor: '#e5e7eb'
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
        {!imageError && currentPhoto ? (
          <img 
            src={currentPhoto} 
            alt={altLocation.title || altLocation.name || 'Alternative location'} 
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
            draggable={false}
            loading="lazy"
            onError={(e) => {
              console.error('❌ Error loading alternative location photo:', {
                url: currentPhoto?.substring(0, 100),
                location: altLocation.title || altLocation.name,
                index: currentIndex
              });
              // Try to load next photo if available
              if (currentIndex < validAltPhotos.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                // Hide broken image
                setImageError(true);
              }
            }}
            onLoad={() => {
              console.log('✅ Loaded alternative location photo:', {
                url: currentPhoto?.substring(0, 100),
                location: altLocation.title || altLocation.name,
                index: currentIndex
              });
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e5e7eb',
            color: '#9ca3af',
            fontSize: '10px'
          }}>
            No photo
          </div>
        )}
      </div>
      
      {/* Dots indicator for multiple photos */}
      {validAltPhotos.length > 1 && (
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
          {validAltPhotos.map((_, index) => (
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

export default function BlockRenderer({ block, onEdit, onSwitchLocation, allBlocks }) {
  if (!block) return null;

  // Wrap all blocks with data-block-id for map scrolling
  const BlockWrapper = ({ children }) => (
    <div data-block-id={block.id}>
      {children}
    </div>
  );

  switch (block.block_type) {
    case 'location':
      return <BlockWrapper><LocationBlock block={block} onEdit={onEdit} onSwitchLocation={onSwitchLocation} /></BlockWrapper>;
    case 'title':
      return <BlockWrapper><TitleBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'photo_text':
      return <BlockWrapper><PhotoTextBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'text':
      return <BlockWrapper><TextBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'slide':
      return <BlockWrapper><SlideBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case '3columns':
      return <BlockWrapper><ThreeColumnsBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'photo':
      return <BlockWrapper><PhotoBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'divider':
      return <BlockWrapper><DividerBlock block={block} onEdit={onEdit} /></BlockWrapper>;
    case 'map':
      return <BlockWrapper><MapBlock block={block} onEdit={onEdit} allBlocks={allBlocks} /></BlockWrapper>;
    default:
      return <BlockWrapper><div>Unknown block type: {block.block_type}</div></BlockWrapper>;
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
    
    // Update block content - preserve enableTimeField
    const updatedContent = {
      mainLocation: newMainLocation,
      alternativeLocations: newAlternativeLocations,
      enableTimeField: content.enableTimeField // Preserve time field setting
    };
    
    console.log('Switching locations:', {
      oldMain: mainLocation.title,
      newMain: newMainLocation.title,
      enableTimeField: content.enableTimeField,
      newMainTime: newMainLocation.time,
      updatedContent
    });
    
    onSwitchLocation({ ...block, content: updatedContent });
  };
  
  // Check if this is a placeholder/empty location block
  const isEmptyLocation = content.isPlaceholder || (
    !mainLocation.title && 
    !mainLocation.description && 
    !mainLocation.address &&
    alternativeLocations.length === 0
  );

  return (
    <div style={{ 
      marginBottom: isMobile ? '10px' : '32px',
      padding: '0'
    }}>
      <div style={{
        padding: '0'
      }}>
      {/* Time badge - only show if time field is enabled */}
      {content.enableTimeField && mainLocation.time && (
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
              photos: mainPhotosArray.map(p => {
                if (!p) return 'null/undefined';
                if (typeof p !== 'string') return `not a string: ${typeof p}`;
                if (p.startsWith('http')) return `HTTP URL: ${p.substring(0, 100)}...`;
                if (p.startsWith('data:image/')) return `Base64: ${p.substring(0, 50)}... (length: ${p.length})`;
                return `Unknown format: ${p.substring(0, 100)}...`;
              })
            });
            
            // Verify photos are valid URLs or base64 data URIs, and refresh API keys
            const validPhotos = mainPhotosArray
              .filter(p => p && typeof p === 'string' && (p.startsWith('http') || p.startsWith('data:image/')))
              .map(refreshPhotoUrl);
            if (validPhotos.length !== mainPhotosArray.length) {
              const invalidPhotos = mainPhotosArray.filter(p => !p || typeof p !== 'string' || (!p.startsWith('http') && !p.startsWith('data:image/')));
              console.warn('⚠️ Some main location photos are invalid:', {
                total: mainPhotosArray.length,
                valid: validPhotos.length,
                invalid: invalidPhotos.length,
                invalidDetails: invalidPhotos.map(p => {
                  if (!p) {
                    return { reason: 'null/undefined', type: typeof p, value: null };
                  }
                  if (typeof p !== 'string') {
                    return { reason: 'not a string', type: typeof p, value: String(p).substring(0, 100) };
                  }
                  // Check what it actually starts with
                  const firstChars = p.substring(0, 50);
                  if (p.startsWith('data:')) {
                    // Check if it's data:image/ or something else
                    if (!p.startsWith('data:image/')) {
                      return { reason: 'data URI but not image', type: typeof p, firstChars, fullLength: p.length };
                    }
                    // If it starts with data:image/, it should be valid - this is unexpected
                    return { reason: 'unexpected rejection (starts with data:image/)', type: typeof p, firstChars, fullLength: p.length };
                  }
                  if (p.startsWith('http')) {
                    return { reason: 'unexpected rejection (starts with http)', type: typeof p, firstChars };
                  }
                  return { reason: 'unknown format', type: typeof p, firstChars, fullLength: p.length };
                })
              });
            }
            
            console.log('✅ Valid photos to display:', {
              count: validPhotos.length,
              types: validPhotos.map(p => p.startsWith('http') ? 'HTTP' : 'Base64')
            });
            
            if (mainPhotosArray.length > 0 && validPhotos.length > 0) {
              return (
                <PhotoCarousel
                  photos={validPhotos}
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
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '48px', opacity: 0.5 }}>📷</span>
                  <span style={{ fontSize: '14px' }}>Photo placeholder</span>
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
            {/* Title - show placeholder when empty */}
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              color: isEmptyLocation ? '#9ca3af' : '#111827',
              lineHeight: '1.2'
            }}>
              {mainLocation.title ? (
                mainLocation.place_id ? (
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
                )
              ) : (
                'Location Block'
              )}
            </h3>
            
            {/* Address - show placeholder when empty */}
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: isEmptyLocation ? '#9ca3af' : '#ef4444', fontSize: '16px' }}>📍</span>
              {mainLocation.address ? (
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
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Address will appear here</span>
              )}
            </div>

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
                      {altLocation.place_id ? (
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${altLocation.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#111827',
                            textDecoration: 'none',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {altLocation.title || altLocation.name || 'Alternative location'}
                        </a>
                      ) : altLocation.address ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(altLocation.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#111827',
                            textDecoration: 'none',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {altLocation.title || altLocation.name || 'Alternative location'}
                        </a>
                      ) : (
                        altLocation.title || altLocation.name || 'Alternative location'
                      )}
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Description - show placeholder hint when empty */}
      {(mainLocation.description || isEmptyLocation) && (
        <div style={{ marginBottom: '16px' }}>
          {mainLocation.description ? (
            mainLocation.description.split('\n\n').map((paragraph, index, array) => (
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
            ))
          ) : (
            <div style={{ color: '#64748b' }}>
              <p style={{ 
                fontSize: '15px', 
                lineHeight: '1.6', 
                marginBottom: '16px',
                margin: 0
              }}>
                Use this block to feature a specific place, attraction, restaurant, or any location you want to highlight in your tour. Click <strong>"Edit block"</strong> to add details.
              </p>
              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  marginBottom: '8px',
                  margin: 0,
                  marginBottom: '8px'
                }}>
                  💡 You can add:
                </p>
                <ul style={{ 
                  fontSize: '14px', 
                  margin: 0,
                  paddingLeft: '20px',
                  lineHeight: '1.8'
                }}>
                  <li>Location name and address</li>
                  <li>Photos (upload or search via Google Maps)</li>
                  <li>Description and your personal recommendations</li>
                  <li>Price range and approximate cost</li>
                  <li>Alternative locations for the same time slot</li>
                </ul>
              </div>
            </div>
          )}
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
                    {altLocation.place_id ? (
                      <a
                        href={`https://www.google.com/maps/place/?q=place_id:${altLocation.place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#111827',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {altLocation.title || altLocation.name || 'Alternative location'}
                      </a>
                    ) : altLocation.address ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(altLocation.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#111827',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {altLocation.title || altLocation.name || 'Alternative location'}
                      </a>
                    ) : (
                      altLocation.title || altLocation.name || 'Alternative location'
                    )}
                  </h5>
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

// Map Block - displays all locations from tour on a map
function MapBlock({ block, onEdit, allBlocks = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const carouselRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const content = block.content || {};
  const isHidden = content.hidden === true;
  const locations = content.locations || [];
  
  // Check if we're in visualizer mode by checking URL path
  // Visualizer is at /guide/tours/visualizer, user page is at /itinerary
  const isVisualizer = typeof window !== 'undefined' && window.location.pathname.includes('/visualizer');
  
  useEffect(() => {
    console.log('🗺️ MapBlock mounted/updated:', {
      blockId: block.id,
      blockType: block.block_type,
      isHidden,
      locationsCount: locations.length,
      hasContent: !!content,
      contentKeys: Object.keys(content)
    });
  }, [block.id, isHidden, locations.length, content]);

  // Enrich locations with photos from allBlocks (location blocks)
  const enrichedLocations = useMemo(() => {
    if (!allBlocks || allBlocks.length === 0) return locations;
    
    // Build a map of blockId+title -> photo from location blocks
    const photoMap = {};
    allBlocks.forEach(b => {
      if (b.block_type === 'location' && b.content) {
        const mainLoc = b.content.mainLocation || b.content;
        if (mainLoc) {
          const photos = mainLoc.photos || (mainLoc.photo ? [mainLoc.photo] : []);
          const photoUrl = photos.find(p => p && typeof p === 'string' && !p.startsWith('data:')) || photos[0] || null;
          const key = `${b.id}_${mainLoc.title || mainLoc.name || ''}`.toLowerCase();
          if (photoUrl) photoMap[key] = photoUrl;
          // Also index by title only for fallback matching
          if (mainLoc.title) photoMap[mainLoc.title.toLowerCase()] = photoUrl;
          if (mainLoc.name) photoMap[mainLoc.name.toLowerCase()] = photoUrl;
        }
        (b.content.alternativeLocations || []).forEach(alt => {
          const photos = alt.photos || (alt.photo ? [alt.photo] : []);
          const photoUrl = photos.find(p => p && typeof p === 'string' && !p.startsWith('data:')) || photos[0] || null;
          const key = `${b.id}_${alt.title || alt.name || ''}`.toLowerCase();
          if (photoUrl) photoMap[key] = photoUrl;
          if (alt.title) photoMap[alt.title.toLowerCase()] = photoUrl;
          if (alt.name) photoMap[alt.name.toLowerCase()] = photoUrl;
        });
      }
    });
    
    return locations.map(loc => {
      if (loc.photo) return loc; // Already has photo
      // Try to find photo by blockId+title, then by title alone
      const key1 = `${loc.blockId}_${loc.title || ''}`.toLowerCase();
      const key2 = (loc.title || '').toLowerCase();
      const foundPhoto = photoMap[key1] || photoMap[key2] || null;
      return foundPhoto ? { ...loc, photo: foundPhoto } : loc;
    });
  }, [locations, allBlocks]);

  // Extract addresses from all blocks if locations not set
  useEffect(() => {
    if (locations.length === 0 && allBlocks.length > 0) {
      // This will be handled by parent component
      console.log('MapBlock: No locations in content, should extract from allBlocks');
    }
  }, [locations, allBlocks]);

  useEffect(() => {
    // Always show map in visualizer, even if hidden from users or no locations
    // Only skip map initialization if hidden AND no locations
    if (isHidden && enrichedLocations.length === 0) {
      setIsLoading(false);
      return;
    }
    
    // If no locations, still show map but don't initialize
    if (enrichedLocations.length === 0) {
      setIsLoading(false);
      return;
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded');
        initializeMap();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        const errorMsg = 'Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_KEY environment variable.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      console.log('🗺️ Loading Google Maps API with key:', apiKey.substring(0, 10) + '...');
      
      // Handle Google Maps API authentication errors (set before loading script)
      window.gm_authFailure = () => {
        console.error('❌ Google Maps API authentication failed. Invalid API key.');
        setError('Google Maps API key is invalid. Please check your VITE_GOOGLE_MAPS_KEY environment variable.');
        setIsLoading(false);
      };
      
      const script = document.createElement('script');
      // Remove loading=async to avoid conflicts, use callback instead
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      
      // Create global callback function
      window.initGoogleMap = () => {
        console.log('✅ Google Maps script loaded successfully via callback');
        // Wait a bit more to ensure all classes are initialized
        setTimeout(() => {
          initializeMap();
        }, 300);
      };
      
      script.onerror = (error) => {
        console.error('❌ Error loading Google Maps script:', error);
        setError('Failed to load Google Maps API. Please check your API key configuration.');
        setIsLoading(false);
        delete window.initGoogleMap;
      };
      
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      // Wait for Google Maps API to be fully initialized
      const checkGoogleMaps = () => {
        if (!window.google || !window.google.maps) {
          console.warn('⚠️ Google Maps not loaded yet, retrying...');
          setTimeout(checkGoogleMaps, 200);
          return;
        }

        // Check if required classes are available
        if (!window.google.maps.LatLngBounds || !window.google.maps.Map || !window.google.maps.Marker) {
          console.warn('⚠️ Google Maps API classes not ready, retrying...');
          setTimeout(checkGoogleMaps, 200);
          return;
        }

        if (!mapRef.current) {
          setError('Map container not found');
          setIsLoading(false);
          return;
        }

        createMap();
      };

      // Start checking after a short delay
      setTimeout(checkGoogleMaps, 100);
    };

    const createMap = () => {
      if (!window.google || !window.google.maps) {
        setError('Google Maps not loaded');
        setIsLoading(false);
        return;
      }

      // Verify all required classes are available
      if (!window.google.maps.LatLngBounds || typeof window.google.maps.LatLngBounds !== 'function') {
        console.error('❌ LatLngBounds is not available. Maps JavaScript API may not be enabled.');
        setError('Maps JavaScript API is not enabled. Please enable it in Google Cloud Console.');
        setIsLoading(false);
        return;
      }

      if (!window.google.maps.Map || typeof window.google.maps.Map !== 'function') {
        console.error('❌ Map constructor is not available.');
        setError('Maps JavaScript API is not properly initialized.');
        setIsLoading(false);
        return;
      }

      try {
        // Inject CSS for map carousel scrollbar hiding
        if (!document.getElementById('gmap-carousel-style')) {
          const style = document.createElement('style');
          style.id = 'gmap-carousel-style';
          style.textContent = `
            .map-location-carousel::-webkit-scrollbar { display: none; }
            .map-location-carousel { scrollbar-width: none; -ms-overflow-style: none; }
          `;
          document.head.appendChild(style);
        }

        // Calculate center from locations or use default
        let center = { lat: 48.8566, lng: 2.3522 }; // Default: Paris
        const bounds = new window.google.maps.LatLngBounds();
        let hasValidCoords = false;

        // Try to get coordinates from locations
        enrichedLocations.forEach(loc => {
          if (loc.lat && loc.lng) {
            bounds.extend(new window.google.maps.LatLng(loc.lat, loc.lng));
            hasValidCoords = true;
          }
        });

        if (hasValidCoords) {
          center = bounds.getCenter();
        }

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: hasValidCoords ? 13 : 10,
          center: center,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy', // Allow map dragging with mouse/one finger
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition.TOP_RIGHT
          }
        });

        mapInstanceRef.current = map;

        // Add markers for each location (use enriched locations with photos)
        const geocoder = new window.google.maps.Geocoder();
        markersRef.current = [];

        enrichedLocations.forEach((location, index) => {
          if (location.lat && location.lng) {
            const markerPosition = new window.google.maps.LatLng(location.lat, location.lng);
            createMarker(markerPosition, location, index);
            bounds.extend(markerPosition);
          } else if (location.address) {
            // Geocode address
            geocoder.geocode({ address: location.address }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const markerPosition = results[0].geometry.location;
                createMarker(markerPosition, location, index);
                bounds.extend(markerPosition);
                map.fitBounds(bounds);
              }
            });
          }
        });

        if (hasValidCoords || markersRef.current.length > 0) {
          map.fitBounds(bounds);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error creating map:', err);
        setError('Error creating map');
        setIsLoading(false);
      }
    };

    const createMarker = (position, location, index) => {
      const marker = new window.google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        label: {
          text: String(location.number || index + 1),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        },
        title: location.title || location.address
      });

      marker.addListener('click', () => {
        // Pan map to this marker
        mapInstanceRef.current.panTo(position);
        
        // Scroll carousel to this card
        setActiveCardIndex(index);
        scrollCarouselToCard(index);
        
        // Scroll page to the block containing this location
        if (location.blockId) {
          setTimeout(() => {
            const blockElement = document.querySelector(`[data-block-id="${location.blockId}"]`);
            if (blockElement) {
              blockElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              blockElement.style.transition = 'box-shadow 0.3s ease';
              blockElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
              setTimeout(() => {
                blockElement.style.boxShadow = '';
              }, 2000);
            }
          }, 100);
        }
      });

      markersRef.current.push({ marker, index });
    };
    
    // Helper: scroll carousel to a specific card
    const scrollCarouselToCard = (cardIndex) => {
      if (carouselRef.current) {
        const cardWidth = 260 + 12; // card width + gap
        carouselRef.current.scrollTo({
          left: cardIndex * cardWidth,
          behavior: 'smooth'
        });
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(({ marker }) => {
        marker.setMap(null);
      });
      markersRef.current = [];
      // Cleanup global callback
      if (window.initGoogleMap) {
        delete window.initGoogleMap;
      }
    };
  }, [enrichedLocations, isHidden]);

  // Handle clicking a card in the carousel — open location in Google Maps
  const handleCardClick = (index) => {
    setActiveCardIndex(index);
    const loc = enrichedLocations[index];
    
    // Open location in Google Maps
    const mapsUrl = loc.place_id 
      ? `https://www.google.com/maps/place/?q=place_id:${loc.place_id}` 
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address || loc.title || '')}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle carousel scroll — detect which card is most visible
  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft - 29; // account for left spacer
    const cardWidth = 260 + 12;
    const newIndex = Math.round(Math.max(0, scrollLeft) / cardWidth);
    if (newIndex !== activeCardIndex && newIndex >= 0 && newIndex < enrichedLocations.length) {
      setActiveCardIndex(newIndex);
      // Pan map to this location
      const loc = enrichedLocations[newIndex];
      if (mapInstanceRef.current && loc.lat && loc.lng) {
        mapInstanceRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      }
    }
  };

  // Always show map block in visualizer (even if hidden from users)
  // The hidden flag only affects public-facing pages

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#ef4444',
        backgroundColor: '#fef2f2',
        borderRadius: '12px',
        marginBottom: '40px',
        border: '2px solid #ef4444'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          Ошибка загрузки карты
        </div>
        <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '16px' }}>
          {error}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <strong>Решение:</strong> Убедитесь, что переменная окружения <code>VITE_GOOGLE_MAPS_KEY</code> настроена в Vercel и содержит действительный ключ Google Maps API.
        </div>
      </div>
    );
  }

  // Always render map block in visualizer
  return (
    <div style={{ marginBottom: '40px' }}>
      {/* Header with title */}
      <div style={{
        marginBottom: '12px'
      }}>
        <h2 style={{
          fontSize: '30px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          Locations Map
        </h2>
      </div>

      {!isCollapsed && (
        <div style={{
          width: '100%',
          height: '500px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          position: 'relative',
          backgroundColor: '#f3f4f6'
        }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1
          }}>
            <div>Loading map...</div>
          </div>
        )}
          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '100%' 
            }} 
          />
          
          {/* Bottom carousel of location cards */}
          {enrichedLocations.length > 0 && !isLoading && (
            <div
              ref={carouselRef}
              className="map-location-carousel"
              onScroll={handleCarouselScroll}
              style={{
                position: 'absolute',
                bottom: '12px',
                left: 0,
                right: 0,
                zIndex: 2,
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Left spacer to ensure padding is visible even when scrolled */}
              <div style={{ flexShrink: 0, width: '29px', minWidth: '29px' }} />
              {enrichedLocations.map((loc, idx) => {
                const isActive = idx === activeCardIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => handleCardClick(idx)}
                    style={{
                      flexShrink: 0,
                      width: '260px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: isActive
                        ? '0 4px 20px rgba(0,0,0,0.25)'
                        : '0 2px 8px rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      scrollSnapAlign: 'start',
                      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                      transform: isActive ? 'scale(1)' : 'scale(0.97)'
                    }}
                  >
                    {/* Photo */}
                    {loc.photo && (
                      <div style={{
                        width: '100%',
                        height: '100px',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={loc.photo}
                          alt={loc.title || 'Location'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {/* Text content */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#1a1a1a',
                        lineHeight: 1.3,
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {loc.number || idx + 1}. {loc.title || 'Location'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#70757a',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {loc.address || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Right spacer */}
              <div style={{ flexShrink: 0, width: '14px', minWidth: '14px' }} />
            </div>
          )}
        </div>
      )}
      
      {/* Collapse button - only show in visualizer (not on user-facing page) */}
      {isVisualizer && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '12px'
        }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title={isCollapsed ? 'Expand map' : 'Collapse map'}
          >
            {isCollapsed ? '▶ Expand' : '▼ Collapse'}
          </button>
        </div>
      )}
      
      {isCollapsed && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginTop: '12px'
        }}>
          Map is collapsed. Click "Expand" to show the map.
        </div>
      )}

      {!isCollapsed && locations.length === 0 && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          marginTop: '16px'
        }}>
          No locations found in tour. Add location blocks to see them on the map.
        </div>
      )}
      {!isCollapsed && isHidden && (
        <div style={{
          padding: '12px',
          textAlign: 'center',
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          marginTop: '12px',
          fontSize: '14px'
        }}>
          ⚠️ This map is hidden from users but visible in the editor
        </div>
      )}
    </div>
  );
}

