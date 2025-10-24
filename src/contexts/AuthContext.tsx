import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../firebase';  // adjust the path to your firebase config
import { Admin } from '../types';

interface AuthContextType {
  currentAdmin: Admin | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved admin in localStorage
    const savedAdmin = localStorage.getItem('currentAdmin');
    if (savedAdmin) {
      setCurrentAdmin(JSON.parse(savedAdmin));
      setIsAuthenticated(true);
    }
  }, []);

const login = async (pin: string): Promise<boolean> => {
  console.log("login started for pin:", pin);
  try {
    setError(null);
    
    if (!/^\d{6,7}$/.test(pin)) {
      setError('PIN must be 6 or 7 digits');
      console.log("PIN format invalid");
      return false;
    }
    
    // Firestore query here
    const q = query(collection(db, "admins"), where("pin", "==", pin));
    const querySnapshot = await getDocs(q);
    
    console.log("Query snapshot size:", querySnapshot.size);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      const adminData = adminDoc.data() as Admin;
      
      const updatedAdmin: Admin = {
        ...adminData,
        id: adminDoc.id,
        lastLogin: new Date().toISOString(),
      };
      
      console.log("Admin found:", updatedAdmin);
      
      setCurrentAdmin(updatedAdmin);
      setIsAuthenticated(true);
      localStorage.setItem('currentAdmin', JSON.stringify(updatedAdmin));
      return true;
    } else {
      setError('Invalid PIN');
      console.log("No admin found with this PIN");
      return false;
    }
  } catch (err) {
    setError('Login failed. Please try again.');
    console.error("Login error:", err);
    return false;
  }
};


  const logout = () => {
    setCurrentAdmin(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentAdmin');
  };

  return (
    <AuthContext.Provider value={{ currentAdmin, login, logout, isAuthenticated, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
