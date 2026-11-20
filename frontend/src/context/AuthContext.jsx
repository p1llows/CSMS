import axios from 'axios';
import React, { createContext, useContext, useState, useEffect } from 'react';

axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Remove any legacy token left in localStorage from older versions
    try {
      localStorage.removeItem('token');
    } catch {}
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile');
      const u = response.data || null;
      if (u) {
        setUser({ ...u, role: String(u.role || '').toUpperCase() });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { user: userData } = response.data;
      setUser(userData ? { ...userData, role: String(userData.role || '').toUpperCase() } : null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      return { success: true, user: response.data?.user || null };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // Ignore network errors during logout; clear client state regardless
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
