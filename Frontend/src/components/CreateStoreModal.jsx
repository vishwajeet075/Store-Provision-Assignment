import React, { useState } from 'react';
import './CreateStoreModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CreateStoreModal = ({ onClose, onStoreCreated }) => {
  const [formData, setFormData] = useState({
    storeName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onStoreCreated(data.store || data);
      } else {
        setError(data.message || 'Failed to create store');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Create store error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Store</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="modal-error animate-fadeIn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="8" cy="12" r="1" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="storeName">Store Name</label>
            <input
              type="text"
              id="storeName"
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              required
              placeholder="My Awesome Store"
              autoFocus
            />
            <span className="form-hint">Choose a unique name for your store</span>
          </div>

          <div className="form-group">
            <label htmlFor="adminEmail">Admin Email</label>
            <input
              type="email"
              id="adminEmail"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleChange}
              required
              placeholder="admin@example.com"
            />
            <span className="form-hint">WooCommerce admin login email</span>
          </div>

          <div className="form-group">
            <label htmlFor="adminPassword">Admin Password</label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength="8"
            />
            <span className="form-hint">Minimum 8 characters</span>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Create Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStoreModal;