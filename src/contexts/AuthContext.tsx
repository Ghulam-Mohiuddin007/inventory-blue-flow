import React, { createContext, useContext, useEffect, useState } from 'react';
import { deviceStorage, type DeviceSession, type UserRole } from '@/services/deviceStorage';

export interface LocalUser {
  id: string;
  email: string;
  name?: string;
  storeName?: string;
  role: UserRole;
}

interface AuthContextType {
  user: LocalUser | null;
  session: DeviceSession | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string, storeName?: string, role?: UserRole) => Promise<{ error: Error | null }>;
  quickDemoLogin: (role?: 'admin' | 'staff') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(() => {
    // Immediate hydration from synchronous local cache to prevent flicker
    const cached = deviceStorage.getCachedSession();
    return cached?.user ? { ...cached.user, role: cached.user.role || 'admin' } : null;
  });
  const [session, setSession] = useState<DeviceSession | null>(() => {
    return deviceStorage.getCachedSession();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check saved session in IndexedDB on boot
    let isMounted = true;
    async function loadActiveSession() {
      try {
        await deviceStorage.ensureInitialized();
        const activeSession = await deviceStorage.getSession();
        if (isMounted) {
          if (activeSession && activeSession.user) {
            setSession(activeSession);
            setUser({
              ...activeSession.user,
              role: activeSession.user.role || 'admin'
            });
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to load session from device IndexedDB:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { user: authedUser, error } = await deviceStorage.loginUser(email, password);
      if (error || !authedUser) {
        return { error: error || new Error('Authentication failed.') };
      }
      const newSession = await deviceStorage.createSession(authedUser);
      setSession(newSession);
      setUser({
        ...newSession.user,
        role: newSession.user.role || 'admin'
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    name?: string,
    storeName?: string,
    role: UserRole = 'shopkeeper'
  ): Promise<{ error: Error | null }> => {
    try {
      const { user: newUser, error } = await deviceStorage.registerUser(email, password, name, storeName, role);
      if (error || !newUser) {
        return { error: error || new Error('Registration failed.') };
      }
      const newSession = await deviceStorage.createSession(newUser);
      setSession(newSession);
      setUser({
        ...newSession.user,
        role: newSession.user.role || 'admin'
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const quickDemoLogin = async (targetRole: 'admin' | 'staff' = 'admin') => {
    if (targetRole === 'admin') {
      const { user: adminUser } = await deviceStorage.loginUser('admin@inventory.local', 'admin123');
      if (adminUser) {
        const newSession = await deviceStorage.createSession(adminUser);
        setSession(newSession);
        setUser({ ...newSession.user, role: 'admin' });
      }
    } else {
      const { user: staffUser } = await deviceStorage.loginUser('cashier@inventory.local', 'staff123');
      if (staffUser) {
        const newSession = await deviceStorage.createSession(staffUser);
        setSession(newSession);
        setUser({ ...newSession.user, role: 'staff' });
      }
    }
  };

  const signOut = async () => {
    await deviceStorage.clearSession();
    setSession(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'shopkeeper';
  const isStaff = user?.role === 'staff';

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isStaff,
    signIn,
    signUp,
    quickDemoLogin,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};