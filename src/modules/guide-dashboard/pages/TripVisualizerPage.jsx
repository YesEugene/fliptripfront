/**
 * Trip Visualizer Page - WYSIWYG editor for tour creation
 * Allows guides to create tours with flexible content blocks
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';
import { getTourById } from '../../../services/api';
import BlockRenderer from '../components/BlockRenderer';
import TextEditor from '../components/TextEditor';

export default function TripVisualizerPage() {
  const navigate = useNavigate();
  const { tourId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTourEditor, setShowTourEditor] = useState(false);

  // Tour basic info state
  const [tourInfo, setTourInfo] = useState({
    city: '',
    title: '',
    description: '',
    preview: null
  });

  useEffect(() => {
    loadUser();
    if (tourId) {
      loadTour();
    }
  }, [tourId]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    setLoading(false);
  };

  const loadTour = async () => {
    try {
      // Load tour basic info
      const tourData = await getTourById(tourId);
      if (tourData && tourData.tour) {
        setTour(tourData.tour);
        setTourInfo({
          city: tourData.tour.city?.name || '',
          title: tourData.tour.title || '',
          description: tourData.tour.description || '',
          preview: tourData.tour.preview_media_url || null
        });
      }

      // Load content blocks
      const blocksResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${tourId}`);
      const blocksData = await blocksResponse.json();
      if (blocksData.success) {
        setBlocks(blocksData.blocks || []);
      }
    } catch (error) {
      console.error('Error loading tour:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions: 1920x1080
          const maxWidth = 1920;
          const maxHeight = 1080;
          
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with quality 0.8
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      callback(compressedBase64);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    }
  };

  const handleSaveTour = async () => {
    try {
      if (!tourId) {
        // Create new tour
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description,
            preview: tourInfo.preview,
            previewType: 'image',
            status: 'draft'
          })
        });

        const data = await response.json();
        if (data.success && data.tour) {
          // Update URL with new tour ID
          navigate(`/guide/tours/visualizer/${data.tour.id}`, { replace: true });
          setTour(data.tour);
          alert('Tour created successfully!');
        } else {
          alert(data.error || 'Failed to create tour');
        }
      } else {
        // Update existing tour
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            tourId,
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description,
            preview: tourInfo.preview,
            previewType: 'image',
            saveAsDraft: true // Save as draft
          })
        });

        const data = await response.json();
        if (data.success) {
          setShowTourEditor(false);
          alert('Tour saved successfully!');
        } else {
          alert(data.error || 'Failed to save tour');
        }
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      alert('Failed to save tour');
    }
  };

  const handleAddBlock = (blockType) => {
    // TODO: Implement block addition
    console.log('Adding block:', blockType);
    setShowBlockSelector(false);
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  const handleMoveBlock = async (blockId, direction) => {
    // TODO: Implement block movement
    console.log('Moving block:', blockId, direction);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ height: '40px', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              Visualizer
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#374151', fontSize: '16px', fontWeight: '500' }}>
              {user?.name || 'User'}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Hero Block - Preview Image with Title */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '450px',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '32px',
          background: tourInfo.preview 
            ? `linear-gradient(to bottom, rgba(75, 85, 99, 0.7), rgba(156, 163, 175, 0.5)), url(${tourInfo.preview})`
            : 'linear-gradient(to bottom, #4b5563, #d1d5db)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px'
        }}>
          {/* Title overlay - always visible */}
          <div style={{ 
            color: 'white', 
            fontSize: '56px', 
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: '1.1',
            letterSpacing: '-0.5px',
            zIndex: 1,
            maxWidth: '90%',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {tourInfo.title || 'Lorem ipsum dolor conta me more upsi colora'}
          </div>
          
          {/* Edit block button */}
          <button
            onClick={() => setShowTourEditor(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 14px',
              backgroundColor: '#fbbf24',
              color: '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              zIndex: 2,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f59e0b'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#fbbf24'}
          >
            Edit block
          </button>

          {/* Download PDF button */}
          <button
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#111827',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 2,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>📄</span>
            Download PDF
          </button>
        </div>

        {/* Tags placeholder */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#fb923c',
            color: 'white',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            City
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#60a5fa',
            color: 'white',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Dates
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#4ade80',
            color: 'white',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Budget
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#f472b6',
            color: 'white',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Interests
          </div>
        </div>

        {/* Content Blocks */}
        {blocks.map((block, index) => (
          <div 
            key={block.id} 
            style={{ marginBottom: '24px', position: 'relative' }}
            onMouseEnter={(e) => {
              const controls = e.currentTarget.querySelector('.block-controls');
              if (controls) controls.style.display = 'flex';
            }}
            onMouseLeave={(e) => {
              const controls = e.currentTarget.querySelector('.block-controls');
              if (controls) controls.style.display = 'none';
            }}
          >
            {/* Block Controls - Only visible on hover */}
            <div 
              className="block-controls"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10,
                display: 'none',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '4px',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <button
                onClick={() => handleMoveBlock(block.id, 'up')}
                disabled={index === 0}
                style={{
                  padding: '4px 8px',
                  backgroundColor: index === 0 ? '#e5e7eb' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: index === 0 ? 0.5 : 1
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveBlock(block.id, 'down')}
                disabled={index === blocks.length - 1}
                style={{
                  padding: '4px 8px',
                  backgroundColor: index === blocks.length - 1 ? '#e5e7eb' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: index === blocks.length - 1 ? 0.5 : 1
                }}
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => handleEditBlock(block)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fbbf24',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
                title="Edit block"
              >
                Edit block
              </button>
            </div>
            
            {/* Render Block */}
            <BlockRenderer block={block} onEdit={() => handleEditBlock(block)} />
          </div>
        ))}

        {/* From author block */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>From author</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Author" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  👤
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                Tour created by <strong style={{ color: '#111827' }}>{user?.name || 'Author'}</strong>
              </p>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                {tourInfo.description || 'September sun, hidden valleys, ancient ruins and flavors of the sea — all woven into one seamless journey. From the first sip of coffee to the last glass of wine by the marina, every hour is crafted to keep you moving, tasting, discovering. Fethiye is not a stop on the map, it\'s a story that unfolds with you.'}
              </p>
              <button style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                Read more
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button
            onClick={() => setShowTourEditor(true)}
            style={{
              padding: '14px 28px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              marginRight: '16px',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 6px rgba(59, 130, 246, 0.3)';
            }}
          >
            Edit tour
          </button>
          <button
            onClick={() => setShowBlockSelector(true)}
            style={{
              padding: '14px 28px',
              backgroundColor: '#86efac',
              color: '#111827',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(134, 239, 172, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#6ee7b7';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(134, 239, 172, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#86efac';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 6px rgba(134, 239, 172, 0.3)';
            }}
          >
            <span style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
            Add block
          </button>
        </div>
      </div>

      {/* Block Selector Modal */}
      {showBlockSelector && (
        <BlockSelectorModal
          onClose={() => setShowBlockSelector(false)}
          onSelect={handleAddBlock}
        />
      )}

      {/* Tour Editor Modal */}
      {showTourEditor && (
        <TourEditorModal
          tourInfo={tourInfo}
          onClose={() => setShowTourEditor(false)}
          onSave={handleSaveTour}
          onChange={setTourInfo}
          onImageUpload={handleImageUpload}
        />
      )}

      {/* Block Editor Modal */}
      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
}

// Placeholder components - will be implemented next
function BlockSelectorModal({ onClose, onSelect }) {
  const blockTypes = [
    { type: 'location', label: 'Location', icon: '📍' },
    { type: 'title', label: 'Title', icon: '📝' },
    { type: 'photo_text', label: 'Photo + Text', icon: '🖼️' },
    { type: 'text', label: 'Text Block', icon: '📄' },
    { type: 'slide', label: 'Slide type', icon: '🎞️' },
    { type: '3columns', label: '3 columns', icon: '📊' },
    { type: 'photo', label: 'Photo', icon: '📷' },
    { type: 'divider', label: 'Divider', icon: '➖' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Add block</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '16px'
        }}>
          {blockTypes.map(block => (
            <div
              key={block.type}
              onClick={() => onSelect(block.type)}
              style={{
                padding: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{block.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{block.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TourEditorModal({ tourInfo, onClose, onSave, onChange }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit tour</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            City *
          </label>
          <input
            type="text"
            value={tourInfo.city}
            onChange={(e) => onChange({ ...tourInfo, city: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Trip name *
          </label>
          <input
            type="text"
            value={tourInfo.title}
            onChange={(e) => onChange({ ...tourInfo, title: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Preview Photo *
          </label>
          <div style={{
            width: '100%',
            height: '200px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            backgroundColor: '#f9fafb'
          }}>
            {tourInfo.preview ? (
              <img src={tourInfo.preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#6b7280' }}>No photo selected</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && onImageUpload) {
                onImageUpload(file, (base64) => {
                  onChange({ ...tourInfo, preview: base64 });
                });
              }
            }}
            style={{ display: 'none' }}
            id="tour-preview-upload"
          />
          <label
            htmlFor="tour-preview-upload"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Choose photo
          </label>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', margin: 0 }}>
            JPG, PNG or GIF. Max size 5MB
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Tour Description *
          </label>
          <textarea
            value={tourInfo.description}
            onChange={(e) => onChange({ ...tourInfo, description: e.target.value })}
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockEditorModal({ block, onClose, onSave, onDelete }) {
  const [content, setContent] = useState(block.content || {});

  const handleSave = () => {
    onSave({ ...block, content });
  };

  const renderEditor = () => {
    switch (block.block_type) {
      case 'title':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <input
                type="text"
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Size
              </label>
              <select
                value={content.size || 'large'}
                onChange={(e) => setContent({ ...content, size: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </>
        );

      case 'text':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Text *
            </label>
            <TextEditor
              value={content.text || ''}
              onChange={(text) => setContent({ ...content, text, formatted: true })}
              placeholder="Enter text..."
            />
          </div>
        );

      case 'photo_text':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && onImageUpload) {
                    onImageUpload(file, (base64) => {
                      setContent({ ...content, photo: base64 });
                    });
                  }
                }}
                style={{ display: 'none' }}
                id={`photo-text-upload-${block.id}`}
              />
              <label
                htmlFor={`photo-text-upload-${block.id}`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose photo
              </label>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <textarea
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Alignment
              </label>
              <select
                value={content.alignment || 'left'}
                onChange={(e) => setContent({ ...content, alignment: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="left">Photo Left</option>
                <option value="right">Photo Right</option>
              </select>
            </div>
          </>
        );

      case 'photo':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo *
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <button style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Choose photo
              </button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Caption
              </label>
              <input
                type="text"
                value={content.caption || ''}
                onChange={(e) => setContent({ ...content, caption: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Optional caption"
              />
            </div>
          </>
        );

      case 'slide':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Title *
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && onImageUpload) {
                    onImageUpload(file, (base64) => {
                      setContent({ ...content, photo: base64 });
                    });
                  }
                }}
                style={{ display: 'none' }}
                id={`slide-photo-upload-${block.id}`}
              />
              <label
                htmlFor={`slide-photo-upload-${block.id}`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose photo
              </label>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <textarea
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </>
        );

      case '3columns':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Columns
            </label>
            {(content.columns || [
              { photo: null, text: 'Column 1 text' },
              { photo: null, text: 'Column 2 text' },
              { photo: null, text: 'Column 3 text' }
            ]).map((column, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Column {index + 1}</h4>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    width: '100%',
                    height: '100px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    {column.photo ? (
                      <img src={column.photo} alt={`Column ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>No photo</span>
                    )}
                  </div>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Choose photo
                  </button>
                </div>
                <textarea
                  value={column.text || ''}
                  onChange={(e) => {
                    const newColumns = [...(content.columns || [])];
                    newColumns[index] = { ...newColumns[index], text: e.target.value };
                    setContent({ ...content, columns: newColumns });
                  }}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            ))}
          </div>
        );

      case 'divider':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Style
            </label>
            <select
              value={content.style || 'solid'}
              onChange={(e) => setContent({ ...content, style: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        );

      case 'location':
        return (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Location block will use existing tour items. Configure locations in the tour editor.
            </p>
          </div>
        );

      default:
        return <p style={{ color: '#6b7280' }}>Editor for {block.block_type} not implemented yet</p>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit block: {block.block_type}</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        {renderEditor()}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => {
              if (onDelete && confirm('Are you sure you want to delete this block?')) {
                onDelete(block.id);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Delete
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

