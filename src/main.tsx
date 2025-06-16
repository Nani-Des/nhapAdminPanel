import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { HospitalProvider } from './contexts/HospitalContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <HospitalProvider>
        <App />
      </HospitalProvider>
    </AuthProvider>
  </StrictMode>
);
