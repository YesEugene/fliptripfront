/**
 * BlockRenderer - Component for rendering different types of content blocks
 */

export default function BlockRenderer({ block, onEdit }) {
  if (!block) return null;

  switch (block.block_type) {
    case 'location':
      return <LocationBlock block={block} onEdit={onEdit} />;
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
  
  // Handle switching between main and alternative locations
  const handleSwitchLocation = (alternativeIndex) => {
    if (!onSwitchLocation) return;
    
    const newMainLocation = alternativeLocations[alternativeIndex];
    const newAlternativeLocations = [...alternativeLocations];
    newAlternativeLocations[alternativeIndex] = mainLocation;
    
    // Update block content
    const updatedContent = {
      mainLocation: newMainLocation,
      alternativeLocations: newAlternativeLocations
    };
    
    onSwitchLocation({ ...block, content: updatedContent });
  };
  
  return (
    <div style={{ marginBottom: '32px' }}>
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

      {/* Main content: Photo and Details */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Photo */}
        <div style={{
          flex: '0 0 300px',
          minWidth: '250px',
          maxWidth: '100%'
        }}>
          {mainLocation.photo ? (
            <img 
              src={mainLocation.photo} 
              alt={mainLocation.title || 'Location'} 
              style={{ 
                width: '100%', 
                height: 'auto',
                borderRadius: '12px',
                objectFit: 'cover'
              }} 
            />
          ) : (
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
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

        {/* Details */}
        <div style={{ flex: 1, minWidth: '250px' }}>
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
      </div>

      {/* Description */}
      {mainLocation.description && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            margin: 0
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
            margin: 0
          }}>
            {mainLocation.recommendations}
          </p>
        </div>
      )}

      {/* Alternative Locations */}
      {alternativeLocations.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#111827'
          }}>
            Author also recommends
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {alternativeLocations.map((altLocation, index) => (
              <div
                key={index}
                onClick={() => handleSwitchLocation(index)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
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
                      height: '150px',
                      objectFit: 'cover'
                    }} 
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '150px',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: '12px'
                  }}>
                    No photo
                  </div>
                )}
                <div style={{ padding: '12px' }}>
                  <h5 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '4px',
                    color: '#111827'
                  }}>
                    {altLocation.title || 'Alternative location'}
                  </h5>
                  {altLocation.price_level && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <span style={{ color: '#f59e0b', fontSize: '12px' }}>⭐</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
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
    <div>
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
  );
}

// Photo + Text Block
function PhotoTextBlock({ block, onEdit }) {
  const content = block.content || {};
  const photo = content.photo;
  const text = content.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  const alignment = content.alignment || 'left';

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      flexDirection: alignment === 'right' ? 'row-reverse' : 'row',
      alignItems: 'center'
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
          margin: 0
        }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// Text Block
function TextBlock({ block, onEdit }) {
  const content = block.content || {};
  const text = content.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  const formatted = content.formatted || false;

  return (
    <div>
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
  );
}

// Slide Block
function SlideBlock({ block, onEdit }) {
  const content = block.content || {};
  const title = content.title || 'Slide Title';
  const photo = content.photo;
  const text = content.text || 'Slide description text';

  return (
    <div>
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
      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
        {text}
      </p>
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

  return (
    <div>
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
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {column.text}
            </p>
          </div>
        ))}
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
    <div>
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
              margin: 0
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
    <div>
      <hr style={{
        border: 'none',
        borderTop: `2px ${borderStyleMap[style]} #e5e7eb`,
        margin: 0
      }} />
    </div>
  );
}

