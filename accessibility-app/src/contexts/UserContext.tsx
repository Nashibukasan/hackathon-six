'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  login: (email: string, accessibilityProfile: any, consentSettings: any) => Promise<User>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = async (email: string, accessibilityProfile: any, consentSettings: any): Promise<User> => {
    try {
      // First try to get existing user
      const existingUser = await fetch(`/api/users/${encodeURIComponent(email)}`);
      
      if (existingUser.ok) {
        // User exists, just set them as current user
        const data = await existingUser.json();
        const user = data.data;
        setCurrentUser(user);
        return user;
      }
      
      // User doesn't exist, create new user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          accessibility_profile: accessibilityProfile,
          consent_settings: consentSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      const user = data.data;
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const value: UserContextType = {
    currentUser,
    setCurrentUser,
    isLoading,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 