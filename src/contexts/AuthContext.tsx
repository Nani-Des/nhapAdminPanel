import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AdminSession {
  uid: string;
  baseRole: 'hospital_admin' | 'hospital_manager' | 'main_admin';
  hospitalId?: string; // Optional for main_admin
  hospitalName?: string;
  permissions?: string[] | { [key: string]: boolean };
  name?: string; // User's name from Users collection
}

interface AuthContextType {
  currentAdmin: AdminSession | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<AdminSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentAdmin(null);
        setIsAuthenticated(false);
        return;
      }

      // Check if we're in the middle of a bulk import operation
      // If so, skip the sign-out logic to preserve the admin session
      const isBulkImporting = sessionStorage.getItem('bulkImporting') === 'true';
      if (isBulkImporting) {
        console.log('Bulk import in progress - skipping auth validation for new user');
        // Don't sign out - let the bulk import handle it
        return;
      }

      const userRef = doc(db, 'Users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await signOut(auth);
        return;
      }

      const userData = userSnap.data();

      if (
        userData.baseRole !== 'hospital_admin' &&
        userData.baseRole !== 'hospital_manager' &&
        userData.baseRole !== 'main_admin'
      ) {
        await signOut(auth);
        return;
      }

      let hospitalName: string | undefined;

      // Only fetch hospital name if user has a hospitalId (not for main_admin)
      if (userData.hospitalId && userData.baseRole !== 'main_admin') {
        const hospitalRef = doc(db, 'Hospital', userData.hospitalId);
        const hospitalSnap = await getDoc(hospitalRef);
        hospitalName = hospitalSnap.exists()
          ? hospitalSnap.data().name
          : undefined;
      }

      // Get user's name from userData
      const userName = userData.Fname && userData.Lname 
        ? `${userData.Fname} ${userData.Lname}`
        : userData.name || user.displayName || undefined;

      setCurrentAdmin({
        uid: user.uid,
        baseRole: userData.baseRole,
        hospitalId: userData.hospitalId,
        hospitalName,
        permissions: userData.Permissions || userData.permissions || [],
        name: userName,
      });

      setIsAuthenticated(true);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true; // role validation happens in listener
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentAdmin(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ currentAdmin, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
