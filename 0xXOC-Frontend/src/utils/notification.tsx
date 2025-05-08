/**
 * Notification system for showing messages to users
 */
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Notification type enum
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  details?: string;
  duration?: number;
  timestamp: number;
}

// Context for notification system
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    message: string, 
    type?: NotificationType, 
    details?: string, 
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearNotifications: () => {}
});

export const useNotification = () => useContext(NotificationContext);

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = (
    message: string,
    type: NotificationType = NotificationType.INFO,
    details?: string,
    duration: number = 5000
  ) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const notification: Notification = {
      id,
      type,
      message,
      details,
      duration,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    if (type === NotificationType.ERROR) {
      console.error('Notification error:', message, details);
    }
  };

  // Remove a notification by ID
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      if (notification.duration) {
        const timeout = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
        
        timeouts.push(timeout);
      }
    });
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications]);

  // The provider component
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearNotifications
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// The actual notification UI component
function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`rounded-md shadow-lg p-4 flex items-start transition-all duration-300 animate-fadeIn
            ${notification.type === NotificationType.ERROR ? 'bg-red-600 text-white' :
              notification.type === NotificationType.WARNING ? 'bg-yellow-500 text-white' :
              notification.type === NotificationType.SUCCESS ? 'bg-green-600 text-white' :
              'bg-blue-600 text-white'}`}
        >
          {/* Icon based on type */}
          <div className="mr-3 mt-0.5">
            {notification.type === NotificationType.ERROR && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === NotificationType.WARNING && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === NotificationType.SUCCESS && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === NotificationType.INFO && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 mr-2">
            <p className="font-medium text-sm">{notification.message}</p>
            {notification.details && (
              <p className="text-xs mt-1 opacity-90">{notification.details}</p>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-auto text-white opacity-70 hover:opacity-100"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper functions for common notifications
export const notify = {
  info: (message: string, details?: string) => {
    const { addNotification } = useNotification();
    addNotification(message, NotificationType.INFO, details);
  },
  success: (message: string, details?: string) => {
    const { addNotification } = useNotification();
    addNotification(message, NotificationType.SUCCESS, details);
  },
  warning: (message: string, details?: string) => {
    const { addNotification } = useNotification();
    addNotification(message, NotificationType.WARNING, details);
  },
  error: (message: string, details?: string) => {
    const { addNotification } = useNotification();
    addNotification(message, NotificationType.ERROR, details);
  }
}; 