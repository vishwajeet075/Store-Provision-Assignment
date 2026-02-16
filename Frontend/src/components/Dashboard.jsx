import React, { useState, useEffect, useRef } from 'react';
import UserMenu from './UserMenu';
import StoreCard from './StoreCard';
import CreateStoreModal from './CreateStoreModal';
import './Dashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    fetchStores();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasProvisioningStores = stores.some(store => 
      ['provisioning', 'deploying'].includes(store.status?.toLowerCase())
    );

    if (hasProvisioningStores) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [stores]);

  const startPolling = () => {
    if (pollingIntervalRef.current) return; 
    
    console.log('🔄 Started polling for store status updates');
    pollingIntervalRef.current = setInterval(() => {
      fetchStores(true); 
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('⏹️ Stopped polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchStores = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
        setError('');
      } else {
        if (!silent) setError('Failed to fetch stores');
      }
    } catch (err) {
      if (!silent) {
        setError('Network error. Please try again.');
        console.error('Fetch stores error:', err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStoreCreated = (newStore) => {
    setStores([newStore, ...stores]);
    setShowCreateModal(false);
    startPolling();
  };

  const handleStoreDeleted = (storeId) => {
    setStores(stores.filter(store => store.id !== storeId));
  };

  const handleStoreUpdated = (updatedStore) => {
    setStores(stores.map(store => 
      store.id === updatedStore.id ? updatedStore : store
    ));
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <h1 className="brand-title">
              <span className="brand-main">STORE</span>
              <span className="brand-sub">PROVISIONER</span>
            </h1>
          </div>
          <UserMenu />
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="header-content">
            <h2 className="header-title">Your Stores</h2>
            <p className="header-subtitle">
              Manage and monitor your WooCommerce stores
            </p>
          </div>
          <button 
            className="create-store-button"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Store
          </button>
        </div>

        {error && (
          <div className="error-banner animate-fadeIn">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="loading-text">Loading stores...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                <path d="M40 25V55M25 40H55" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="empty-title">No stores yet</h3>
            <p className="empty-description">
              Create your first WooCommerce store to get started
            </p>
            <button 
              className="empty-cta"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Store
            </button>
          </div>
        ) : (
          <div className="stores-grid">
            {stores.map((store, index) => (
              <StoreCard 
                key={store.id || index} 
                store={store}
                index={index}
                onStoreDeleted={handleStoreDeleted}
                onStoreUpdated={handleStoreUpdated}
              />
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateStoreModal 
          onClose={() => setShowCreateModal(false)}
          onStoreCreated={handleStoreCreated}
        />
      )}
    </div>
  );
};

export default Dashboard;