import React, { createContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../api/authApi.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      const accessToken = localStorage.getItem('vexa_access');
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getMe();
        setUser(response.data);
      } catch (error) {
        console.error('Помилка авторизації:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginUser(email, password);
      const { accessToken, refreshToken, user: userData } = response.data;

      localStorage.setItem('vexa_access', accessToken);
      localStorage.setItem('vexa_refresh', refreshToken);
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      return handleApiError(error);
    }
  };

  const register = async (fullName, email, password, role) => {
    try {
      await registerUser(email, password, fullName);
      
      return { success: true, message: 'Реєстрація успішна. Перевірте email.' };
    } catch (error) {
      return handleApiError(error);
    }
  };

  const logout = () => {
    localStorage.removeItem('vexa_access');
    localStorage.removeItem('vexa_refresh');
    setUser(null);
  };

  const handleApiError = (error) => {
    if (error.response) {
      if (error.response.status === 429) {
        return { success: false, error: 'Забагато спроб. Будь ласка, зачекайте хвилинку і спробуйте знову.' };
      }
      
      if (error.response.data?.error?.details) {
        return { 
          success: false, 
          error: 'Помилка валідації', 
          details: error.response.data.error.details
        };
      }

      return { success: false, error: error.response.data.message || 'Помилка сервера' };
    }
    return { success: false, error: 'Помилка з\'єднання з сервером' };
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};