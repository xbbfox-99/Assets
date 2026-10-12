import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Failsafe timeout so the user never gets stuck on a blank screen if Firebase takes time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(
      auth, 
      (currentUser) => {
        clearTimeout(timer);
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.warn('Auth state observation error:', err);
        clearTimeout(timer);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-wabi-bg px-6 text-center select-none">
          <div className="space-y-4">
            <h1 className="text-3xl font-serif text-wabi-ink tracking-tight">WabiBalance</h1>
            <p className="text-wabi-stone text-xs tracking-widest uppercase animate-pulse">載入中 Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
