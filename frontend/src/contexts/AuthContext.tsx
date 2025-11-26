import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  affiliation?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isApproved: boolean;
  checkApprovalStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isApproved, setIsApproved] = useState(true);

  const checkApprovalStatus = async (): Promise<boolean> => {
    try {
      const response = await authAPI.checkStatus();
      if (response.data.approved) {
        setUser(response.data.user);
        setIsApproved(true);
        return true;
      } else {
        setIsApproved(false);
        return false;
      }
    } catch (error) {
      setIsApproved(false);
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    const { token: newToken, role } = response.data;

    setToken(newToken);
    localStorage.setItem('token', newToken);

    // Check approval status
    await checkApprovalStatus();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsApproved(true);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (token) {
      checkApprovalStatus();
    }
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    isApproved,
    checkApprovalStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
