import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  FolderOpen,
  CircleDollarSign,
} from 'lucide-react';

export const navGroups = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
      { to: '/payments', label: 'Payments', icon: CircleDollarSign },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/payments', label: 'Payments', icon: CircleDollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MOBILE_PRIMARY_COUNT = 4;
