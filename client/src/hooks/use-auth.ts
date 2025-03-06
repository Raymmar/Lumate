import { create } from 'zustand';
import { User } from '@shared/schema';
import { createContext, useContext, ReactNode } from 'react';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  subscribe: (callback: () => void) => () => void;
}

const subscribers = new Set<() => void>();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to login');
      }

      const data = await response.json();
      set({ user: data.user, isLoading: false });
      subscribers.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to logout');
      }

      set({ user: null, isLoading: false });
      subscribers.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      // Update the local state optimistically
      set({ user: { ...currentUser, ...userData } });
      // Notify subscribers of the change
      subscribers.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      });
    }
  },
  subscribe: (callback: () => void) => {
    if (typeof callback !== 'function') {
      console.error('Subscribe callback must be a function');
      return () => {};
    }

    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }
}));

// Create context for the auth store
const AuthContext = createContext<typeof useAuthStore | null>(null);

// Create provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={useAuthStore}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook with proper TypeScript types
export const useAuth = () => {
  const store = useContext(AuthContext);
  if (!store) throw new Error('useAuth must be used within an AuthProvider');
  return store;
};

export default useAuth;