// src/pages/SelfDestruct.tsx
import React, { useState } from 'react';
import axios from 'axios';

const UsersVerify: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      const response = await axios.post('http://localhost:5350/users/admin-verify', { code });
      setMessage('Verified User .');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Verification error');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Code de verification d utilisateur</h2>
      <input
        type="password"
        placeholder="Entrer le code secret"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{ padding: '0.5rem', marginRight: '1rem' }}
      />
      <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', backgroundColor: 'red', color: 'white' }}>
        Verifier
      </button>
      <p style={{ marginTop: '1rem' }}>{message}</p>
    </div>
  );
};

export default UsersVerify;
