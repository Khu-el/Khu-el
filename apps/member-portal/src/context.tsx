import { createContext, useContext } from 'react';
import type { Profile, StaffRole } from './types';
import type { Route } from './logic/routes';

export interface PortalContextValue {
  userId: string;
  email: string;
  profile: Profile;
  /** Null for members. Only the database decides this (public.current_staff_role). */
  staffRole: StaffRole | null;
  /** The member's own timezone, or the browser's when they have not set one. */
  timezone: string | null;
  refreshProfile: () => Promise<void>;
  /** Unread in-app notifications, for the header badge. */
  unreadCount: number;
  refreshUnread: () => void;
  navigate: (route: Route) => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside the signed-in portal');
  return ctx;
}

/** Staff capabilities, mirroring the database's role checks (the database still enforces them). */
export const can = {
  triageSupport: (r: StaffRole | null) => r !== null,
  editContent: (r: StaffRole | null) => r === 'editor' || r === 'admin' || r === 'owner',
  manageInvites: (r: StaffRole | null) => r === 'admin' || r === 'owner',
};
