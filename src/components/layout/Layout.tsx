import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderPlus,
  Activity,
  RefreshCw,
  LogOut,
  Menu,
  X,
  FilePlus2,
  CircleUser,
  Clock,
  Upload,
  Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHospital } from '../../contexts/HospitalContext';
import { db, storage } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentAdmin, logout } = useAuth();
  const { hospital, notifications } = useHospital();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hospitalLogo, setHospitalLogo] = useState<string | null>(null);
  const [hospitalBanner, setHospitalBanner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Fetch hospital logo and banner from Firestore
  useEffect(() => {
    const fetchHospitalData = async () => {
      if (hospital?.id) {
        try {
          const hospitalDoc = await getDoc(doc(db, 'Hospital', hospital.id));
          if (hospitalDoc.exists()) {
            const data = hospitalDoc.data();
            setHospitalLogo(data.Logo || null);
            setHospitalBanner(data['Background Image'] || null);
          }
        } catch (err) {
          console.error('Failed to fetch hospital data:', err);
          setHospitalLogo(null);
          setHospitalBanner(null);
        }
      }
    };
    fetchHospitalData();
  }, [hospital?.id]);

  // Handle file uploads
  const handleUpload = async () => {
    if (!hospital?.id || !currentAdmin?.isAdmin || (!logoFile && !bannerFile)) return;

    setIsUploading(true);
    try {
      const updates: { [key: string]: string } = {};
      if (logoFile) {
        const logoRef = ref(storage, `hospital_logos/${hospital.id}/logo.png`);
        await uploadBytes(logoRef, logoFile);
        const logoUrl = await getDownloadURL(logoRef);
        updates.Logo = logoUrl;
        setHospitalLogo(logoUrl);
      }
      if (bannerFile) {
        const bannerRef = ref(storage, `hospital_logos/${hospital.id}/banner.png`);
        await uploadBytes(bannerRef, bannerFile);
        const bannerUrl = await getDownloadURL(bannerRef);
        updates['Background Image'] = bannerUrl;
        setHospitalBanner(bannerUrl);
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'Hospital', hospital.id), updates);
      }
      setIsModalOpen(false);
      setLogoFile(null);
      setBannerFile(null);
    } catch (err) {
      console.error('Failed to upload images:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Departments', path: '/departments', icon: <FolderPlus className="w-5 h-5" /> },
    { label: 'Medical Records', path: '/medical-records', icon: <FileText className="w-5 h-5" /> },
    { label: 'Doctors', path: '/doctors', icon: <CircleUser className="w-5 h-5" /> },
    { label: 'Shift Schedule', path: '/shift-schedule', icon: <Clock className="w-5 h-5" /> },
    { label: 'Services', path: '/services', icon: <FilePlus2 className="w-5 h-5" /> },
    { label: 'Referrals', path: '/referrals', icon: <RefreshCw className="w-5 h-5" /> },
    { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" />, badge: unreadNotifications },
    
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-teal-50">
      {/* Header */}
      <header
        className="text-white shadow-md sticky top-0"
        style={{
          background: hospitalBanner
            ? `url(${hospitalBanner}) no-repeat center/cover`
            : 'linear-gradient(to right, #0d9488, #0f766e)',
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8 backdrop-blur-sm bg-teal-600/30">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-teal-100 hover:text-white hover:bg-teal-800 focus:outline-none transition-colors duration-200"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-shrink-0 flex items-center ml-4">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm shadow-md">
                  <Activity className="h-6 w-6 text-teal-100" />
                </div>
                <span className="ml-3 text-xl font-bold text-teal-100">
                  {hospital?.["Hospital Name"]} Admin
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {hospitalLogo ? (
                    <img
                      src={hospitalLogo}
                      alt="Hospital Logo"
                      className="h-10 w-10 rounded-lg object-cover shadow-md cursor-pointer"
                      onClick={() => currentAdmin?.isAdmin && setIsModalOpen(true)}
                      title="Change logo and banner"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center text-white font-semibold shadow-md cursor-pointer"
                      onClick={() => currentAdmin?.isAdmin && setIsModalOpen(true)}
                      title="Change logo and banner"
                    >
                      {currentAdmin?.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-teal-100">
                    {currentAdmin?.name}
                  </div>
                  <div className="text-xs text-teal-200 truncate">
                    {hospital?.["Hospital Name"]}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-teal-100 hover:text-white hover:bg-teal-800 focus:outline-none transition-colors duration-200"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {isModalOpen && currentAdmin?.isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-teal-100 p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-teal-900">Update Hospital Images</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-teal-700 hover:text-teal-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-900 mb-1">
                  Hospital Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-teal-200 rounded-lg text-teal-700 bg-teal-50"
                  disabled={isUploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-900 mb-1">
                  Header Banner
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-teal-200 rounded-lg text-teal-700 bg-teal-50"
                  disabled={isUploading}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-teal-700 bg-teal-200 hover:bg-teal-300 transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center"
                  disabled={isUploading || (!logoFile && !bannerFile)}
                >
                  {isUploading ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <Upload className="h-5 w-5 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar */}
        <div
          className={`lg:hidden fixed inset-0 z-50 flex transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-teal-100 shadow-2xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-teal-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="mt-5 px-3 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`group flex items-center px-4 py-3 text-base font-medium rounded-lg w-full transition-all duration-200 transform hover:scale-[1.02] ${
                      location.pathname === item.path
                        ? 'bg-teal-600 text-white'
                        : 'text-teal-900 hover:bg-teal-200 hover:text-teal-800'
                    }`}
                  >
                    <span className="mr-3 text-teal-700 group-hover:text-teal-800 group-hover:scale-110 transition-transform duration-200">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14 bg-black/50" aria-hidden="true"></div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-72 bg-teal-100 border-r border-teal-200 shadow-lg">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="mt-5 flex-1 px-3 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full transition-all duration-200 transform hover:scale-[1.02] relative group ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'text-teal-900 hover:bg-teal-200 hover:text-teal-800'
                      }`}
                    >
                      <span className={`mr-3 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-teal-700 group-hover:text-teal-800'
                      }`}>
                        {item.icon}
                      </span>
                      {item.label}
                      <span className="absolute left-0 top-0 h-full w-1 bg-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-shrink-0 flex border-t border-teal-200 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  {hospitalLogo ? (
                    <img
                      src={hospitalLogo}
                      alt="Hospital Logo"
                      className="h-12 w-12 rounded-lg object-cover shadow-md cursor-pointer"
                      onClick={() => currentAdmin?.isAdmin && setIsModalOpen(true)}
                      title="Change logo and banner"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center text-white font-semibold shadow-md"
                      onClick={() => currentAdmin?.isAdmin && setIsModalOpen(true)}
                      title="Change logo and banner"
                    >
                      {currentAdmin?.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-teal-900">
                    {currentAdmin?.name}
                  </div>
                  <div className="text-xs text-teal-700 truncate text-wrap">
                    {hospital?.["Hospital Name"]}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto p-2 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-200 focus:outline-none transition-colors duration-200"
                  title="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;