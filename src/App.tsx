import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HospitalProvider } from './contexts/HospitalContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
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
    return <Navigate to="/login\" replace />;
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
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/departments" 
              element={
                <ProtectedRoute>
                  <DepartmentsPage />
                </ProtectedRoute>
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
                <ProtectedRoute>
                  <MedicalRecordsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctors" 
              element={
                <ProtectedRoute>
                  <DoctorsPage />
                </ProtectedRoute>
              } 
            />
                        <Route 
              path="/shift-schedule" 
              element={
                <ProtectedRoute>
                  <ShiftSchedule />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/services" 
              element={
                <ProtectedRoute>
                  <ServicesPage />
                </ProtectedRoute>
              } 
            />
                        <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
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
                <ProtectedRoute>
                  <ReferralsPage />
                </ProtectedRoute>
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