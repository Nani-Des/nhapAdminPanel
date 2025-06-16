import React from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types';
import { useHospital } from '../../contexts/HospitalContext';
import Button from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface NotificationPreviewProps {
  notifications: Notification[];
  limit?: number;
}

const NotificationPreview: React.FC<NotificationPreviewProps> = ({
  notifications,
  limit = 5,
}) => {
  const navigate = useNavigate();
  const { markNotificationAsRead } = useHospital();
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markNotificationAsRead(id);
  };

  const getNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const displayedNotifications = notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Notifications</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/notifications')}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {displayedNotifications.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {displayedNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`
                  flex items-start space-x-3 p-3 rounded-md transition-colors
                  ${notification.read ? 'bg-white' : 'bg-blue-50'}
                  hover:bg-gray-50 cursor-pointer
                `}
                onClick={() => navigate(`/notifications/${notification.id}`)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getNotificationDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={(e) => handleMarkAsRead(e, notification.id)}
                  >
                    <span className="sr-only">Mark as read</span>
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreview;