import React, { useState } from 'react';
import './StoreCard.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const StoreCard = ({ store, index, onStoreDeleted, onStoreUpdated }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleVisitStore = () => {
    if (store.url || store.storeUrl) {
      window.open(store.url || store.storeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stores/${store.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onStoreDeleted(store.id);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete store');
      }
    } catch (err) {
      console.error('Delete store error:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'ready':
      case 'running':
        return 'status-active';
      case 'pending':
      case 'provisioning':
      case 'deploying':
        return 'status-pending';
      case 'error':
      case 'failed':
        return 'status-error';
      default:
        return 'status-inactive';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return 'Ready';
      case 'provisioning':
        return 'Provisioning...';
      case 'deploying':
        return 'Deploying...';
      case 'failed':
        return 'Failed';
      default:
        return status || 'Active';
    }
  };

  const isProvisioning = ['provisioning', 'deploying'].includes(store.status?.toLowerCase());
  const isReady = store.status?.toLowerCase() === 'ready';
  const hasUrl = store.url || store.storeUrl;

  return (
    <div 
      className="store-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="store-card-header">
        <div className="store-info">
          <h3 className="store-name">{store.name || store.storeName}</h3>
          <div className={`store-status ${getStatusColor(store.status)}`}>
            <span className="status-dot"></span>
            {getStatusText(store.status)}
          </div>
        </div>
        <button 
          className="delete-store-button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          title="Delete store"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5H15M7 8V13M11 8V13M4 5L5 15C5 15.5523 5.44772 16 6 16H12C12.5523 16 13 15.5523 13 15L14 5M7 5V3C7 2.44772 7.44772 2 8 2H10C10.5523 2 11 2.44772 11 3V5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="store-card-body">
        {isProvisioning ? (
          <div className="provisioning-container">
            <div className="loading-spinner"></div>
            <p className="provisioning-text">
              Setting up your store... This may take a few minutes.
            </p>
          </div>
        ) : (
          <>
            {hasUrl && (
              <div className="store-detail">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="detail-icon">
                  <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2.5 8H13.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 2C9.5 4 10 6 10 8C10 10 9.5 12 8 14C6.5 12 6 10 6 8C6 6 6.5 4 8 2Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <div className="detail-content">
                  <span className="detail-label">URL</span>
                  <a 
                    href={store.url || store.storeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-value store-url"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {store.url || store.storeUrl}
                  </a>
                </div>
              </div>
            )}

            {store.errorMessage && (
              <div className="store-detail error-message">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="detail-icon">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 4V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="12" r="1" fill="currentColor"/>
                </svg>
                <div className="detail-content">
                  <span className="detail-label">Error</span>
                  <span className="detail-value">{store.errorMessage}</span>
                </div>
              </div>
            )}

            {store.createdAt && (
              <div className="store-detail">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="detail-icon">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div className="detail-content">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {new Date(store.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="store-card-footer">
        <button 
          className="visit-store-button"
          onClick={handleVisitStore}
          disabled={!hasUrl || isProvisioning}
        >
          <span>{isProvisioning ? 'Provisioning...' : 'Visit Store'}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Delete Store?</h4>
            <p>Are you sure you want to delete <strong>{store.name || store.storeName}</strong>?</p>
            <p className="delete-warning">This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button 
                className="cancel-delete-button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Store'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-glow"></div>
    </div>
  );
};

export default StoreCard;