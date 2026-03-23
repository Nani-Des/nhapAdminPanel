import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type AppBaseRole =
  | 'main_admin'
  | 'hospital_admin'
  | 'hospital_manager'
  | 'doctor';

interface AdminSession {
  uid: string;
  baseRole: AppBaseRole;
  /** Firestore `Users.Role` — true for clinical users (doctors) in your schema. */
  roleFlag?: boolean;
  hospitalId?: string; // Optional for main_admin
  hospitalName?: string;
  permissions?: string[] | { [key: string]: boolean };
  name?: string; // User's name from Users collection
}

const STAFF_BASE_ROLES = ['main_admin', 'hospital_admin', 'hospital_manager'] as const;

/** Can access hospital admin / manager / super-admin features. */
export const isStaffAdminUser = (s: AdminSession | null | undefined): boolean =>
  !!s &&
  STAFF_BASE_ROLES.includes(s.baseRole as (typeof STAFF_BASE_ROLES)[number]);

/**
 * Doctor-only UI: `Users.Role === true` and not a staff admin role.
 * (Admins may also have Role true; they keep the full panel.)
 */
export const isDoctorUser = (s: AdminSession | null | undefined): boolean =>
  s?.roleFlag === true && !isStaffAdminUser(s);

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

      const brRaw = userData.baseRole;
      const isStaff =
        typeof brRaw === 'string' &&
        STAFF_BASE_ROLES.includes(brRaw as (typeof STAFF_BASE_ROLES)[number]);
      const roleTrue = userData.Role === true;

      if (!isStaff && !roleTrue) {
        await signOut(auth);
        return;
      }

      const effectiveBaseRole: AppBaseRole = isStaff
        ? (brRaw as AppBaseRole)
        : 'doctor';

      const resolvedHospitalId =
        (typeof userData.hospitalId === 'string' && userData.hospitalId) ||
        (typeof userData['Hospital ID'] === 'string' && userData['Hospital ID']) ||
        (typeof userData.HospitalID === 'string' && userData.HospitalID) ||
        undefined;

      let hospitalName: string | undefined;

      // Only fetch hospital name if user has a hospital (not for main_admin without selection)
      if (resolvedHospitalId && effectiveBaseRole !== 'main_admin') {
        const hospitalRef = doc(db, 'Hospital', resolvedHospitalId);
        const hospitalSnap = await getDoc(hospitalRef);
        if (hospitalSnap.exists()) {
          const hd = hospitalSnap.data();
          hospitalName =
            (typeof hd['Hospital Name'] === 'string' && hd['Hospital Name']) ||
            (typeof hd.name === 'string' && hd.name) ||
            undefined;
        }
      }

      // Get user's name from userData
      const userName = userData.Fname && userData.Lname 
        ? `${userData.Fname} ${userData.Lname}`
        : userData.name || user.displayName || undefined;

      setCurrentAdmin({
        uid: user.uid,
        baseRole: effectiveBaseRole,
        roleFlag: roleTrue,
        hospitalId: resolvedHospitalId,
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
