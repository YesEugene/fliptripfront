/**
 * Admin Locations Page
 * Manage locations database
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  exportToCSV,
  getTags
} from '../services/adminService';
import { getCurrentUser, logout } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';
import LocationFormModal from '../components/LocationFormModal';

export default function AdminLocationsPage() {
  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadLocations();
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const data = await getTags();
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (filterCategory) {
        filters.category = filterCategory;
      }
      if (filterSource) {
        filters.source = filterSource;
      }
      if (filterTag) {
        filters.tag_id = filterTag;
      }
      if (filterVerified !== '') {
        filters.verified = filterVerified;
      }
      const data = await getLocations(filters);
      setLocations(data.locations || []);
    } catch (err) {
      console.error('Error loading locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (locationId, locationName) => {
    console.log('🗑️ Delete clicked for:', locationId, locationName);
    
    if (!window.confirm(`Are you sure you want to delete "${locationName}"?`)) {
      console.log('❌ Delete cancelled by user');
      return;
    }

    console.log('✅ Delete confirmed, starting deletion...');
    
    try {
      setDeletingId(locationId);
      console.log('📡 Calling deleteLocation API for:', locationId);
      
      const result = await deleteLocation(locationId);
      console.log('✅ Delete API response:', result);
      
      console.log('🔄 Reloading locations list...');
      await loadLocations();
      
      setDeletingId(null);
      console.log('✅ Delete completed successfully');
      
      // Show success message
      alert(`Location "${locationName}" deleted successfully`);
    } catch (err) {
      console.error('❌ Delete error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      alert('Error deleting location: ' + (err.message || 'Unknown error. Check console for details.'));
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(locations, 'locations');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filterCategory, filterSource, filterTag, filterVerified]);

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/admin/dashboard">
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link
              to="/admin/dashboard"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              ← Back to Dashboard
            </Link>
            <span style={{ color: '#6b7280' }}>Admin: {user.name || user.email}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
            Locations Management
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExport}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Add Location
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
          
          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Categories</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="museum">Museum</option>
              <option value="bar">Bar</option>
              <option value="attraction">Attraction</option>
              <option value="hotel">Hotel</option>
              <option value="shop">Shop</option>
              <option value="park">Park</option>
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Sources</option>
              <option value="admin">Admin</option>
              <option value="guide">Guide</option>
              <option value="import">Import</option>
              <option value="ai">AI</option>
              <option value="google">Google</option>
            </select>

            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>

            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Status</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>

            {(filterCategory || filterSource || filterTag || filterVerified) && (
              <button
                onClick={() => {
                  setFilterCategory('');
                  setFilterSource('');
                  setFilterTag('');
                  setFilterVerified('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Locations List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading locations...</p>
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            color: '#991b1b'
          }}>
            <p>Error: {error}</p>
            <button
              onClick={loadLocations}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Verified</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No locations found
                    </td>
                  </tr>
                ) : (
                  locations.map((location) => (
                    <tr key={location.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{location.name || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        {location.city?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>{location.category || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: location.verified ? '#d1fae5' : '#fee2e2',
                          color: location.verified ? '#065f46' : '#991b1b',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {location.verified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td 
                        style={{ 
                          padding: '12px',
                          position: 'relative',
                          zIndex: 1
                        }}
                        onClick={(e) => {
                          // Prevent row click from interfering with button clicks
                          if (e.target.tagName === 'BUTTON') {
                            e.stopPropagation();
                          }
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px',
                          position: 'relative',
                          zIndex: 2
                        }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingLocation(location);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              position: 'relative',
                              zIndex: 3
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              console.log('🔘 Delete button clicked', location.id, location.name);
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(location.id, location.name);
                            }}
                            disabled={deletingId === location.id}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: deletingId === location.id ? '#9ca3af' : '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: deletingId === location.id ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              opacity: deletingId === location.id ? 0.6 : 1,
                              pointerEvents: deletingId === location.id ? 'none' : 'auto',
                              position: 'relative',
                              zIndex: 3
                            }}
                          >
                            {deletingId === location.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Location Modal */}
      {(showCreateModal || editingLocation) && (
        <LocationFormModal
          location={editingLocation}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLocation(null);
          }}
          onSave={async (locationData) => {
            try {
              console.log('💾 Saving location:', locationData);
              if (editingLocation) {
                console.log('✏️ Updating location:', editingLocation.id);
                await updateLocation(editingLocation.id, locationData);
                alert('Location updated successfully!');
              } else {
                console.log('➕ Creating new location');
                await createLocation(locationData);
                alert('Location created successfully!');
              }
              setShowCreateModal(false);
              setEditingLocation(null);
              await loadLocations();
            } catch (err) {
              console.error('❌ Save error:', err);
              alert('Error saving location: ' + (err.message || 'Unknown error. Check console for details.'));
            }
          }}
        />
      )}
    </div>
  );
}

