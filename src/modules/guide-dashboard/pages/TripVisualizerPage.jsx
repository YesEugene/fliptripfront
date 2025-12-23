/**
 * Trip Visualizer Page - WYSIWYG editor for tour creation
 * Allows guides to create tours with flexible content blocks
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../auth/services/authService';
import { getGuideProfile } from '../../../modules/guide-profile';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';
import PDFIcon from '../../../assets/PDF.svg';
import { getTourById } from '../../../services/api';
import BlockRenderer from '../components/BlockRenderer';
import TextEditor from '../components/TextEditor';

export default function TripVisualizerPage() {
  const navigate = useNavigate();
  const { tourId } = useParams();
  const [user, setUser] = useState(null);
  const [guideProfile, setGuideProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTourEditor, setShowTourEditor] = useState(false);
  const [isAuthorTextExpanded, setIsAuthorTextExpanded] = useState(false);

  // Tour basic info state
  const [tourInfo, setTourInfo] = useState({
    city: '',
    title: '',
    description: '',
    preview: null
  });

  useEffect(() => {
    loadUser();
    loadGuideProfile();
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

  const loadGuideProfile = async () => {
    try {
      const profile = await getGuideProfile();
      if (profile) {
        setGuideProfile(profile);
      }
    } catch (error) {
      console.error('Error loading guide profile:', error);
    }
  };

  const loadTour = async (id = null) => {
    const tourIdToLoad = id || tourId;
    if (!tourIdToLoad) return;
    
    try {
      // Load tour basic info
      const tourData = await getTourById(tourIdToLoad);
      // getTourById returns tour object directly, not wrapped
      const tourObj = tourData?.tour || tourData;
      if (tourObj) {
        setTour(tourObj);
        setTourInfo({
          city: tourObj.city?.name || '',
          title: tourObj.title || '',
          description: tourObj.description || '',
          preview: tourObj.preview_media_url || null
        });
      }

      // Load content blocks
      const blocksResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${tourIdToLoad}`);
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

  const handleSaveAsDraft = async () => {
    try {
      // Validate required fields
      if (!tourInfo.city || !tourInfo.title) {
        alert('Please fill in City and Trip name before saving');
        return;
      }
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to save the tour');
        return;
      }
      
      if (!tourId) {
        // Create new tour as draft
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'draft',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: [],
            meta: {}
          })
        });

        const data = await response.json();
        if (data.success && data.tour) {
          // Update URL with new tour ID
          const newTourId = data.tour.id;
          navigate(`/guide/tours/visualizer/${newTourId}`, { replace: true });
          setTour(data.tour);
          // Update tourId in state by reloading tour
          await loadTour(newTourId);
          alert('Tour saved as draft!');
        } else {
          alert(data.error || 'Failed to save tour');
        }
      } else {
        // Update existing tour as draft
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update?id=${tourId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            saveAsDraft: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Update tour error:', errorData);
          alert(errorData.error || `Failed to save tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          // Reload tour to get updated preview image
          await loadTour();
          alert('Tour saved as draft!');
        } else {
          alert(data.error || 'Failed to save tour');
        }
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      alert('Failed to save tour');
    }
  };

  const handleSaveTour = async () => {
    // This function is called from TourEditorModal
    // Save tour as draft when editing from modal
    setShowTourEditor(false);
    // Call handleSaveAsDraft to actually save the tour
    await handleSaveAsDraft();
  };

  const handleSubmitForModeration = async () => {
    try {
      // Validate required fields
      if (!tourInfo.city || !tourInfo.title) {
        alert('Please fill in City and Trip name before submitting');
        return;
      }
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to submit the tour');
        return;
      }
      
      if (!tourId) {
        // Create new tour and submit for moderation
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'pending',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: [],
            meta: {}
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Submit tour error:', errorData);
          alert(errorData.error || `Failed to submit tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success && data.tour) {
          // Update URL with new tour ID
          const newTourId = data.tour.id;
          navigate(`/guide/tours/visualizer/${newTourId}`, { replace: true });
          setTour(data.tour);
          // Reload page to update tourId from URL params
          window.location.reload();
        } else {
          alert(data.error || 'Failed to submit tour');
        }
      } else {
        // Update existing tour and submit for moderation
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update?id=${tourId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'pending'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Update tour error:', errorData);
          alert(errorData.error || `Failed to submit tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          // Reload tour to get updated preview image
          await loadTour();
          alert('Tour submitted for moderation!');
        } else {
          alert(data.error || 'Failed to submit tour');
        }
      }
    } catch (error) {
      console.error('Error submitting tour:', error);
      alert('Failed to submit tour');
    }
  };

  const handleAddBlock = async (blockType) => {
    console.log('Adding block:', blockType);
    
    // If no tourId, we need to create a tour first
    if (!tourId) {
      alert('Please save the tour first before adding blocks');
      setShowBlockSelector(false);
      return;
    }

    try {
      // Determine default content based on block type
      let defaultContent = {};
      switch (blockType) {
        case 'title':
          defaultContent = { text: 'New Title', size: 'large' };
          break;
        case 'text':
          defaultContent = { text: 'New text block', formatted: false };
          break;
        case 'photo_text':
          defaultContent = { photo: null, text: 'New photo and text block', alignment: 'left' };
          break;
        case 'slide':
          defaultContent = { title: 'Slide Title', photo: null, text: 'Slide description' };
          break;
        case '3columns':
          defaultContent = { 
            columns: [
              { photo: null, text: 'Column 1 text' },
              { photo: null, text: 'Column 2 text' },
              { photo: null, text: 'Column 3 text' }
            ]
          };
          break;
        case 'photo':
          defaultContent = { photo: null, caption: '' };
          break;
        case 'divider':
          defaultContent = { style: 'solid' };
          break;
        case 'location':
          defaultContent = { tour_block_id: null };
          break;
        default:
          defaultContent = {};
      }

      // Get the next order_index (highest + 1)
      const maxOrder = blocks.length > 0 
        ? Math.max(...blocks.map(b => b.order_index || 0))
        : -1;

      // Create block via API
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add blocks');
        setShowBlockSelector(false);
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tourId: tourId,
          blockType: blockType,
          orderIndex: maxOrder + 1,
          content: defaultContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Add block error:', errorData, 'Status:', response.status);
        alert(errorData.error || `Failed to add block (${response.status}). Check console for details.`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.block) {
        // Add block to local state
        setBlocks(prev => [...prev, data.block].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        setShowBlockSelector(false);
        
        // Automatically open editor for new block
        setEditingBlock(data.block);
      } else {
        alert(data.error || 'Failed to add block');
      }
    } catch (error) {
      console.error('Error adding block:', error);
      alert('Error adding block. Please try again.');
    }
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  const handleSaveBlock = async (updatedBlock) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          blockId: updatedBlock.id,
          content: updatedBlock.content,
          orderIndex: updatedBlock.order_index
        })
      });

      const data = await response.json();
      
      if (data.success && data.block) {
        // Update block in local state
        setBlocks(prev => 
          prev.map(b => b.id === updatedBlock.id ? data.block : b)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        );
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to save block');
      }
    } catch (error) {
      console.error('Error saving block:', error);
      alert('Error saving block. Please try again.');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ blockId })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove block from local state
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to delete block');
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('Error deleting block. Please try again.');
    }
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
          height: '300px',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '32px',
          background: tourInfo.preview 
            ? `linear-gradient(to bottom, rgba(75, 85, 99, 0.7), rgba(156, 163, 175, 0.5)), url(${tourInfo.preview})`
            : 'linear-gradient(to bottom, #4b5563, #d1d5db)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '20px 30px'
        }}>
          {/* Title overlay - top left aligned */}
          <div style={{ 
            color: 'white', 
            fontSize: '35px', 
            fontWeight: '700',
            textAlign: 'left',
            lineHeight: '1.2',
            letterSpacing: '-0.3px',
            zIndex: 1,
            maxWidth: '80%',
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
              padding: '9.6px 19.2px',
              backgroundColor: 'white',
              color: '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 2,
              transition: 'all 0.2s',
              transform: 'scale(0.8)',
              transformOrigin: 'left bottom'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(0.8) translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(0.8) translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
          >
            <img 
              src={PDFIcon} 
              alt="PDF" 
              style={{ width: '16px', height: '16px' }}
            />
            Download PDF
          </button>
        </div>

        {/* Tags placeholder */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          marginTop: '-10px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#FFE7CE',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            City
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#CFF2FF',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Dates
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#CFFFE1',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Budget
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#FFCFCF',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
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
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #D0D0D0',
          marginBottom: '40px',
          marginTop: '-10px'
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: '120px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                overflow: 'hidden',
                marginBottom: '12px',
                border: '3px solid #f3f4f6'
              }}>
                {(guideProfile?.avatar || user?.avatar) ? (
                  <img src={guideProfile?.avatar || user?.avatar} alt="Author" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '40px' }}>
                    👤
                  </div>
                )}
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: '1.5',
                whiteSpace: 'pre-line'
              }}>
                Tour created{'\n'}by <strong style={{ color: '#111827', fontWeight: '600' }}>{guideProfile?.name || user?.name || 'Author'}</strong>
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                marginBottom: '16px', 
                color: '#111827',
                marginTop: 0
              }}>
                From author
              </h3>
              <div>
                <p style={{ 
                  color: '#4b5563', 
                  fontSize: '15px', 
                  lineHeight: '1.7', 
                  marginBottom: '16px',
                  marginTop: 0,
                  ...(isAuthorTextExpanded ? {} : {
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  })
                }}>
                  {tourInfo.description || 'September sun, hidden valleys, ancient ruins and flavors of the sea — all woven into one seamless journey. From the first sip of coffee to the last glass of wine by the marina, every hour is crafted to keep you moving, tasting, discovering. Fethiye is not a stop on the map, it\'s a story that unfolds with you.'}
                </p>
                {(() => {
                  const text = tourInfo.description || 'September sun, hidden valleys, ancient ruins and flavors of the sea — all woven into one seamless journey. From the first sip of coffee to the last glass of wine by the marina, every hour is crafted to keep you moving, tasting, discovering. Fethiye is not a stop on the map, it\'s a story that unfolds with you.';
                  // Approximate line count: ~80 chars per line, line-height 1.7
                  const estimatedLines = Math.ceil(text.length / 80);
                  const shouldShowButton = estimatedLines > 5;
                  
                  if (!shouldShowButton) return null;
                  
                  return (
                    <button 
                      onClick={() => setIsAuthorTextExpanded(!isAuthorTextExpanded)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#EFEFEF',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#e5e5e5';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#EFEFEF';
                      }}
                    >
                      {isAuthorTextExpanded ? 'Read less' : 'Read more'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '40px', 
          marginTop: '-10px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setShowBlockSelector(true)}
            style={{
              flex: '1',
              minWidth: '150px',
              padding: '14px 28px',
              backgroundColor: '#fbbf24',
              color: '#111827',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f59e0b';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#fbbf24';
            }}
          >
            <span style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
            Add block
          </button>
          <button
            onClick={handleSaveAsDraft}
            style={{
              flex: '1',
              minWidth: '150px',
              padding: '14px 28px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#4b5563';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6b7280';
            }}
          >
            Save as Draft
          </button>
          <button
            onClick={handleSubmitForModeration}
            style={{
              flex: '1',
              minWidth: '150px',
              padding: '14px 28px',
              backgroundColor: '#4ade80',
              color: '#111827',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4ade80';
            }}
          >
            Submit for Moderation
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

function BlockEditorModal({ block, onClose, onSave, onDelete, onImageUpload }) {
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

