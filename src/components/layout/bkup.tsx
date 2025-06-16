import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FolderPlus, 
  Activity, 
  Star, 
  RefreshCw, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  FilePlus2,
  CircleUser,
  User,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHospital } from '../../contexts/HospitalContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentAdmin, logout } = useAuth();
  const { hospital, notifications } = useHospital();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Departments', path: '/departments', icon: <FolderPlus className="w-5 h-5" /> },
    // { label: 'Users', path: '/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Medical Records', path: '/medical-records', icon: <FileText className="w-5 h-5" /> },
    { label: 'Doctors', path: '/doctors', icon: <CircleUser className="w-5 h-5" /> },
    { label: 'Shift Schedule', path: '/shift-schedule', icon: <Clock className="w-5 h-5" /> },
    { label: 'Services', path: '/services', icon: <FilePlus2 className="w-5 h-5" /> },
    // { label: 'Ratings', path: '/ratings', icon: <Star className="w-5 h-5" /> },
    { label: 'Referrals', path: '/referrals', icon: <RefreshCw className="w-5 h-5" /> },
    // { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" />, badge: unreadNotifications },
    // { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-shrink-0 flex items-center">
                <User className="h-8 w-8 text-teal-600" />
                <span className="ml-2 text-xl font-bold text-teal-600">Nhap Admin Panel</span>
              </div>
            </div>
            {/* <div className="flex items-center">
              <div className="relative">
                <button
                  type="button"
                  className="p-1 mr-4 rounded-full text-gray-400 hover:text-gray-500 relative"
                  onClick={() => navigate('/notifications')}
                >
                  <Bell className="h-6 w-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for mobile */}
        <div
          className={`lg:hidden fixed inset-0 z-40 flex ${
            isSidebarOpen ? 'transform translate-x-0' : 'transform -translate-x-full'
          } transition-transform duration-300 ease-in-out`}
        >
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={toggleSidebar}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="mt-5 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={
                        `group flex items-center px-2 py-2 text-base font-medium rounded-md w-full
                        ${
        isActive
          ? 'bg-teal-600 text-white'
          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
      }
                        `
                      }
                    >
                      <span className="text-gray-500 group-hover:text-gray-900 mr-3">
                        {item.icon}
                      </span>
                      {item.label}
                      {/* {item.badge ? (
                        <span className="ml-auto bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : null} */}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>

        {/* Sidebar for desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={
                        `group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full
                        ${
                          isActive
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:text-teal-900 hover:bg-gray-100'
                        }
                        `
                      }
                    >
                      <span className={`mr-3
                                               ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-700 group-hover:text-teal-900 hover:bg-gray-100'
                        }
                        `}>
                        {item.icon}
                      </span>
                      {item.label}
                      {/* {item.badge ? (
                        <span className="ml-auto bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : null} */}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {currentAdmin?.name.charAt(0)}
                    </div>
                  </div>
                  <div className="ml-3 hidden md:block">
                    <div className="text-sm font-medium text-gray-900">
                      {currentAdmin?.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate text-wrap">
                      {hospital?.["Hospital Name"]}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-6 p-1 rounded-full text-red-500 hover:text-gray-500 focus:outline-none"
                >
                  <LogOut className="h-5 w-5" />
                </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;