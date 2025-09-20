import React, { useState } from 'react';

const PhotoGallery = ({ photos, placeName, isPreview = false }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: isPreview ? '120px' : '200px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        fontSize: isPreview ? '12px' : '14px',
        backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop&auto=format")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          📸 No photos available
        </div>
      </div>
    );
  }

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setSelectedPhoto(photos[index]);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    const nextIndex = (currentIndex + 1) % photos.length;
    setCurrentIndex(nextIndex);
    setSelectedPhoto(photos[nextIndex]);
  };

  const prevPhoto = () => {
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setCurrentIndex(prevIndex);
    setSelectedPhoto(photos[prevIndex]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
  };

  return (
    <>
      {/* Thumbnail Gallery */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '12px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {photos.map((photo, index) => (
          <div
            key={index}
            onClick={() => openLightbox(index)}
            style={{
              minWidth: '80px',
              height: '60px',
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'border-color 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'transparent';
            }}
          >
            <img
              src={photo.thumbnail || photo.url}
              alt={`${placeName} photo ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop&auto=format';
              }}
            />
            {photo.source === 'google_places' && (
              <div style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 4px',
                borderRadius: '3px'
              }}>
                📍
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '50%',
                zIndex: 1001
              }}
            >
              ×
            </button>

            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  style={{
                    position: 'absolute',
                    left: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '50%',
                    zIndex: 1001
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={nextPhoto}
                  style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '50%',
                    zIndex: 1001
                  }}
                >
                  ›
                </button>
              </>
            )}

            {/* Main Photo */}
            <img
              src={selectedPhoto.url}
              alt={`${placeName} photo ${currentIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format';
              }}
            />

            {/* Photo Counter */}
            {photos.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '14px',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                {currentIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;


