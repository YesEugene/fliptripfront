/**
 * BlockRenderer - Component for rendering different types of content blocks
 */

import { useState, useEffect } from 'react';

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
  
  // Detect screen size for responsive layout
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
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
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
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
          {mainLocation.photo ? (
            <img 
              src={mainLocation.photo} 
              alt={mainLocation.title || 'Location'} 
              style={{ 
                width: '100%', 
                aspectRatio: '1',
                borderRadius: '12px',
                objectFit: 'cover',
                objectPosition: 'center'
              }} 
            />
          ) : (
            <div style={{
              width: '100%',
              aspectRatio: '1',
              backgroundColor: '#e5e7eb',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af'
            }}>
              No photo
            </div>
          )}
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
                {mainLocation.title}
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

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {mainLocation.approx_cost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981', fontSize: '16px' }}>💰</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Avg. spend: {mainLocation.approx_cost}
                  </span>
                </div>
              )}
              {mainLocation.price_level && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>⭐</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    Price level: {mainLocation.price_level}
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
                    {altLocation.photo ? (
                      <img 
                        src={altLocation.photo} 
                        alt={altLocation.title || 'Alternative location'} 
                        style={{ 
                          width: '100%', 
                          height: '59px',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }} 
                      />
                    ) : (
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
                    )}
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
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            margin: 0,
            whiteSpace: 'pre-line'
          }}>
            {mainLocation.description}
          </p>
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
          <p style={{ 
            fontSize: '15px', 
            lineHeight: '1.6', 
            color: '#4b5563',
            margin: 0,
            whiteSpace: 'pre-line'
          }}>
            {mainLocation.recommendations}
          </p>
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
                {altLocation.photo ? (
                  <img 
                    src={altLocation.photo} 
                    alt={altLocation.title || 'Alternative location'} 
                    style={{ 
                      width: '100%', 
                      height: '59px',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }} 
                  />
                ) : (
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
                )}
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

  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
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
  const photo = content.photo;
  const text = content.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  const alignment = content.alignment || 'left';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile: image first, then text below
  if (isMobile) {
    return (
      <div style={{ 
        marginBottom: '32px',
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div style={{
          padding: '0',
          paddingLeft: '0',
          paddingRight: '0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          {photo ? (
            <img 
              src={photo} 
              alt="Content" 
              style={{ 
                width: '100%', 
                height: '200px', 
                objectFit: 'cover', 
                borderRadius: '8px' 
              }} 
            />
          ) : (
            <div style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#e5e7eb',
              borderRadius: '8px',
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
          <p style={{ 
            color: '#111827', 
            fontSize: '16px', 
            lineHeight: '1.6',
            margin: 0,
            whiteSpace: 'pre-line'
          }}>
            {text}
          </p>
        </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: side by side
  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div style={{
      display: 'flex',
      gap: '24px',
      flexDirection: alignment === 'right' ? 'row-reverse' : 'row',
      alignItems: 'flex-start'
    }}>
      <div style={{ flex: '0 0 300px' }}>
        {photo ? (
          <img 
            src={photo} 
            alt="Content" 
            style={{ 
              width: '100%', 
              height: '200px', 
              objectFit: 'cover', 
              borderRadius: '8px' 
            }} 
          />
        ) : (
          <div style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            No photo
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ 
          color: '#111827', 
          fontSize: '16px', 
          lineHeight: '1.6',
          margin: 0,
          whiteSpace: 'pre-line'
        }}>
          {text}
        </p>
      </div>
        </div>
      </div>
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
        marginBottom: '32px',
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div style={{
          padding: '0',
          paddingLeft: '0',
          paddingRight: '0'
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
            <p style={{ 
              color: '#111827', 
              fontSize: '16px', 
              lineHeight: '1.6',
              margin: 0,
              whiteSpace: 'pre-line'
            }}>
              {column1}
            </p>
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
            <p style={{ 
              color: '#111827', 
              fontSize: '16px', 
              lineHeight: '1.6',
              margin: 0,
              whiteSpace: 'pre-line'
            }}>
              {column2}
            </p>
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
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
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
        <p style={{ 
          color: '#111827', 
          fontSize: '16px', 
          lineHeight: '1.6',
          margin: 0
        }}>
          {text}
        </p>
      )}
      </div>
    </div>
  );
}

// Slide Block
function SlideBlock({ block, onEdit }) {
  const content = block.content || {};
  const title = content.title || 'Slide Title';
  const photo = content.photo;
  const text = content.text || 'Slide description text';

  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
          {title}
        </h3>
      {photo ? (
        <img 
          src={photo} 
          alt={title} 
          style={{ 
            width: '100%', 
            height: '300px', 
            objectFit: 'cover', 
            borderRadius: '8px',
            marginBottom: '12px'
          }} 
        />
      ) : (
        <div style={{
          width: '100%',
          height: '300px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
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
        {text}
      </p>
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
        marginBottom: '32px',
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div style={{
          padding: '0',
          paddingLeft: '0',
          paddingRight: '0'
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
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }} 
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '200px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '8px',
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
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
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
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }} 
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '8px',
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
  const photo = content.photo;
  const caption = content.caption || '';

  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        {photo ? (
        <>
          <img 
            src={photo} 
            alt="Content" 
            style={{ 
              width: '100%', 
              height: 'auto', 
              borderRadius: '8px',
              marginBottom: caption ? '12px' : 0
            }} 
          />
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
          height: '400px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }}>
          No photo
        </div>
      )}
      </div>
    </div>
  );
}

// Divider Block
function DividerBlock({ block, onEdit }) {
  const content = block.content || {};
  const style = content.style || 'solid';

  const borderStyleMap = {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted'
  };

  return (
    <div style={{ 
      marginBottom: '32px',
      padding: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }}>
      <div style={{
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
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

