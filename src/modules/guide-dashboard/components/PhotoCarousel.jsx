/**
 * Photo Carousel Component
 * Supports swipe navigation and fullscreen view
 */

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export function PhotoCarousel({ photos, onPhotoClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // Minimum swipe distance (in pixels)
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

    if (isLeftSwipe && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!photos || photos.length === 0) {
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

  // Normalize photos array - support both single photo (string) and array
  const photosArray = Array.isArray(photos) ? photos : [photos];
  const currentPhoto = photosArray[currentIndex] || photosArray[0];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          aspectRatio: '1',
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => onPhotoClick && onPhotoClick(photosArray, currentIndex)}
      >
        <img
          src={currentPhoto}
          alt={`Photo ${currentIndex + 1}`}
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
      {photosArray.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '12px'
        }}>
          {photosArray.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: index === currentIndex ? '#3b82f6' : '#d1d5db',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fullscreen Photo Viewer
 */
export function FullscreenPhotoViewer({ photos, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
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

    if (isLeftSwipe && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose]);

  const photosArray = Array.isArray(photos) ? photos : [photos];
  const currentPhoto = photosArray[currentIndex] || photosArray[0];

  // Use React Portal to render outside of any z-index context
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 99999, // Very high z-index to be above everything
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}
      >
        ×
      </button>

      {/* Photo */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px 80px'
        }}
      >
        <img
          src={currentPhoto}
          alt={`Photo ${currentIndex + 1} of ${photosArray.length}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
      </div>

      {/* Dots indicator at bottom */}
      {photosArray.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 10001
          }}
        >
          {photosArray.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? '32px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      {photosArray.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: '16px',
            zIndex: 10001
          }}
        >
          {currentIndex + 1} / {photosArray.length}
        </div>
      )}
    </div>,
    document.body // Render to body to escape any z-index context
  );
}

