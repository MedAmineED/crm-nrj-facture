import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import ApiUrls from '@/API/Urls';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean | null; // Allow null to indicate uninitialized state
  isLoading: boolean; // New loading state
  login: (data: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!token); // Start loading if token exists

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (token) {
        try {
          setIsLoading(true);
          const response = await axios.get(ApiUrls.BASE_URL + 'auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(response.data, 'User details fetched successfully');
          setIsAdmin(response.data.roles.includes('admin'));
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          setIsAdmin(false);
          delete axios.defaults.headers.common['Authorization'];
        } finally {
          setIsLoading(false); // Loading complete
        }
      } else {
        setIsLoading(false); // No token, no loading
      }
    };

    fetchUserDetails();
  }, [token]);

  const login = async (data: { username: string; password: string }) => {
    try {
      const response = await axios.post(`${ApiUrls.BASE_URL}auth/login`, data);
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    } catch (error) {
      throw new Error('Invalid username or password');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAdmin(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const authState: AuthState = {
    token,
    isAuthenticated: !!token,
    isAdmin,
    isLoading, // Expose loading state
    login,
    logout,
  };

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};