import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ApiUrls from '@/API/Urls';
import { useAuth } from '@/hooks/useAuth';

const Page = () => {
  const { isAdmin, isLoading: isAuthLoading, token } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Redirect non-admins or unauthenticated users
  if (!isAuthLoading && !isAdmin) {
    navigate('/dashboard'); // Redirect to login page
    return null;
  }

  const handleSubmit = async () => {
    if (!token) {
      setError('Authentication token is missing');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await axios.delete(ApiUrls.BASE_URL + 'admin/facture-service', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { message, dlFiles, clTables } = res.data;
      setResponse(
        `${message}. Deleted files: ${dlFiles.deleted.join(', ') || 'None'}. ` +
        `Failed deletions: ${dlFiles.failed.join(', ') || 'None'}. ` +
        `Database tables cleared successfully.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete file or clear database'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return isAdmin && <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Admin Secret Action</h2>
      <div className="mb-4">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code de vérification (Placeholder)
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter verification code"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isLoading ? 'Processing...' : 'Envoyer'}
      </button>
      {response && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
          {response}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  ;
};

export default Page;