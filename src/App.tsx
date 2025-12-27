import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HospitalProvider, useHospital } from './contexts/HospitalContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HospitalSelectionPage from './pages/HospitalSelectionPage';
// import UsersPage from './pages/UsersPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import DoctorsPage from './pages/DoctorsPage';
import ServicesPage from './pages/ServicesPage';
// import RatingsPage from './pages/RatingsPage';
import NotFoundPage from './pages/NotFoundPage';
// import AddDepartmentPage from './pages/AddDepartmentPage';
import DepartmentsPage from './pages/DepartmentsPage';
import SettingsPage from './pages/SettingsPage';
// import NotificationsPage from './pages/NotificationsPage';
import ReferralsPage from './pages/ReferralsPage';
import ShiftSchedule from './pages/ShiftSchedule';
import { Toaster } from 'react-hot-toast';
import NotificationsPage from './pages/NotificationsPage';
// import ShiftSchedulePage from './pages/ShiftSchedulePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Component to handle main_admin routing
const MainAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAdmin } = useAuth();
  const { hospital } = useHospital();
  
  // If main_admin and no hospital selected, redirect to hospital selection
  if (currentAdmin?.baseRole === 'main_admin' && !hospital) {
    return <Navigate to="/select-hospital" replace />;
  }
  
  return <>{children}</>;
};

// Helper function to check if user has permission
const hasPermission = (permissions: string[] | { [key: string]: boolean } | undefined, permissionKey: string): boolean => {
  if (!permissions) return false;
  
  // If permissions is an array of strings
  if (Array.isArray(permissions)) {
    return permissions.includes(permissionKey);
  }
  
  // If permissions is an object with boolean values
  if (typeof permissions === 'object') {
    return permissions[permissionKey] === true;
  }
  
  return false;
};

const PermissionProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  permission: string;
}> = ({ children, permission }) => {
  const { isAuthenticated, currentAdmin } = useAuth();
  const { hospital } = useHospital();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // For main_admin, require hospital selection
  if (currentAdmin?.baseRole === 'main_admin' && !hospital) {
    return <Navigate to="/select-hospital" replace />;
  }
  
  // Dashboard is always accessible
  if (permission === 'dashboard') {
    return <>{children}</>;
  }
  
  // main_admin has access to everything (if hospital is selected)
  if (currentAdmin?.baseRole === 'main_admin') {
    return <>{children}</>;
  }
  
  // Check if user has the required permission
  if (!hasPermission(currentAdmin?.permissions, permission)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <HospitalProvider>
                <Toaster position="top-center" reverseOrder={false} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/select-hospital" 
              element={
                <ProtectedRoute>
                  <HospitalSelectionPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainAdminRoute>
                    <DashboardPage />
                  </MainAdminRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/departments" 
              element={
                <PermissionProtectedRoute permission="departments">
                  <DepartmentsPage />
                </PermissionProtectedRoute>
              } 
            />
            {/* <Route 
              path="/departments/new" 
              element={
                <ProtectedRoute>
                  <AddDepartmentPage />
                </ProtectedRoute>
              } 
            /> */}
            {/* <Route 
              path="/users" 
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              } 
            /> */}
            <Route 
              path="/medical-records" 
              element={
                <PermissionProtectedRoute permission="medical_records">
                  <MedicalRecordsPage />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/doctors" 
              element={
                <PermissionProtectedRoute permission="doctors">
                  <DoctorsPage />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/shift-schedule" 
              element={
                <PermissionProtectedRoute permission="shift_schedule">
                  <ShiftSchedule />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/services" 
              element={
                <PermissionProtectedRoute permission="services">
                  <ServicesPage />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <PermissionProtectedRoute permission="notifications">
                  <NotificationsPage />
                </PermissionProtectedRoute>
              } 
            />
            {/* <Route 
              path="/ratings" 
              element={
                <ProtectedRoute>
                  <RatingsPage />
                </ProtectedRoute>
              } 
            /> */}
            <Route 
              path="/referrals" 
              element={
                <PermissionProtectedRoute permission="referrals">
                  <ReferralsPage />
                </PermissionProtectedRoute>
              } 
            />
                        <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HospitalProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;