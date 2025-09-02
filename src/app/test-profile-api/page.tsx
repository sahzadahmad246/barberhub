'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-client';

export default function TestProfileAPI() {
  const { user, isAuthenticated } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testGetProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/profile');
      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data.data);
      } else {
        setError(data.message || 'Failed to fetch profile');
      }
    } catch  {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const testUpdateProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Test Name',
          email: user?.email || 'test@example.com'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data.data);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch  {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Profile API Test</h1>
      
      <div className="mb-4">
        <p><strong>Authentication Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
        {user && (
          <div className="mt-2">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.name}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <button
          onClick={testGetProfile}
          disabled={loading || !isAuthenticated}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test GET Profile'}
        </button>

        <button
          onClick={testUpdateProfile}
          disabled={loading || !isAuthenticated}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
        >
          {loading ? 'Loading...' : 'Test UPDATE Profile'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {profileData && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold">Profile Data:</h3>
          <pre className="mt-2 text-sm">{JSON.stringify(profileData, null, 2)}</pre>
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p>You need to be authenticated to test the profile API. Please log in first.</p>
        </div>
      )}
    </div>
  );
}