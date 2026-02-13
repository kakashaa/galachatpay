import React from 'react';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';

/**
 * Component that listens for admin notifications
 * Place this in the admin dashboard to enable real-time notifications
 */
export const AdminNotificationListener: React.FC = () => {
  useAdminNotifications();
  return null;
};

export default AdminNotificationListener;
