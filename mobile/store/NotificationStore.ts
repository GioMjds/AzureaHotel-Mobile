import { create } from 'zustand';

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  setNotifications: (n: any[]) => void;
  setUnreadCount: (c: number) => void;
}

const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (n) => set({ notifications: n }),
  setUnreadCount: (c) => set({ unreadCount: c }),
}));

export default useNotificationStore;
