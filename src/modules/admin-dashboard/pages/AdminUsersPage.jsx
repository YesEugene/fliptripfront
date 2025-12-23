/**
 * Admin Users Page
 * Manage users and access
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getUsers,
  createUserByEmail,
  updateUser,
  deleteUser,
  exportToCSV
} from '../services/adminService';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function AdminUsersPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'guide', 'user', 'admin'
  const [sortBy, setSortBy] = useState('role'); // 'role', 'name', 'email', 'created'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (roleFilter !== 'all') {
        filters.role = roleFilter;
      }
      const data = await getUsers(filters);
      let loadedUsers = data.users || [];
      
      // Sort users
      loadedUsers = [...loadedUsers].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'role':
            // Sort by role: admin > guide > user
            const roleOrder = { 'admin': 3, 'guide': 2, 'creator': 2, 'user': 1 };
            aValue = roleOrder[a.role] || 0;
            bValue = roleOrder[b.role] || 0;
            break;
          case 'name':
            aValue = (a.name || '').toLowerCase();
            bValue = (b.name || '').toLowerCase();
            break;
          case 'email':
            aValue = (a.email || '').toLowerCase();
            bValue = (b.email || '').toLowerCase();
            break;
          case 'created':
            aValue = new Date(a.createdAt || a.created_at || 0);
            bValue = new Date(b.createdAt || b.created_at || 0);
            break;
          default:
            return 0;
        }
        
        if (sortBy === 'created') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else if (sortBy === 'role') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        }
      });
      
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      alert('Please enter email');
      return;
    }

    try {
      const result = await createUserByEmail(newUserEmail, newUserRole, newUserName);
      if (result.success) {
        const message = `User created successfully!\n\nEmail: ${newUserEmail}\nTemporary Password: ${result.tempPassword}\n\nPlease save this password - it will not be shown again.`;
        alert(message);
        setShowCreateModal(false);
        setNewUserEmail('');
        setNewUserRole('user');
        setNewUserName('');
        loadUsers();
      } else {
        alert('Error creating user: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error creating user: ' + err.message);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await updateUser(userId, { is_active: !currentStatus });
      loadUsers();
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
  };

  const handleDelete = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user "${userEmail}"?`)) {
      return;
    }

    try {
      await deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleExport = () => {
    exportToCSV(users, 'users');
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle column sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

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
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        maxWidth: '100%', 
        margin: '0 auto', 
        padding: '0 20px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
            Users Management
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
              + Create User
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search users..."
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
        </div>

        {/* Users List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading users...</p>
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
              onClick={loadUsers}
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
            overflowX: 'auto', // Enable horizontal scroll for mobile/tablet
            overflowY: 'hidden',
            width: '100%' // Full width on desktop
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              tableLayout: 'fixed' // Fixed layout for consistent column widths
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th 
                    onClick={() => handleSort('email')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Email{getSortIndicator('email')}
                  </th>
                  <th 
                    onClick={() => handleSort('name')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th 
                    onClick={() => handleSort('role')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Role{getSortIndicator('role')}
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>PDF Purchases</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Guided Purchases</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Tours Created</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Generated Tours</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Purchased Tours</th>
                  <th 
                    onClick={() => handleSort('created')}
                    style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Created{getSortIndicator('created')}
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{u.email || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{u.name || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: u.role === 'admin' ? '#fef3c7' : u.role === 'guide' ? '#dbeafe' : '#e5e7eb',
                          color: u.role === 'admin' ? '#92400e' : u.role === 'guide' ? '#1e40af' : '#374151',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: u.is_active ? '#d1fae5' : '#fee2e2',
                            color: u.is_active ? '#065f46' : '#991b1b',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>
                            {u.sales?.pdf || 0}
                          </span>
                          {u.sales?.pdfRevenue > 0 && (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              ${(u.sales.pdfRevenue || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                            {u.sales?.guided || 0}
                          </span>
                          {u.sales?.guidedRevenue > 0 && (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              ${(u.sales.guidedRevenue || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {(u.role === 'guide' || u.role === 'creator') ? (
                          <span style={{ fontWeight: '600', color: '#10b981' }}>
                            {u.toursCreated || 0}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#8b5cf6' }}>
                          {u.toursGenerated || 0}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#f59e0b' }}>
                          {u.toursPurchased || 0}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
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
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Create User
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Email *
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="user@example.com"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Name
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="User Name"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="user">User</option>
                <option value="guide">Guide</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUserEmail('');
                  setNewUserRole('user');
                  setNewUserName('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
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
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

