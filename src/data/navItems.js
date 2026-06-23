import {
  LayoutDashboard,
  Users,
  Mail,
  FileQuestion,
  ClipboardList,
  Ship,
  FolderOpen,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Inbox,
  CheckSquare,
  Truck,
} from 'lucide-react';

// Primary nav items shown in sidebar (desktop) and bottom nav (mobile, first 4)
export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/inbox', label: 'Quote Inbox', icon: Inbox },
  { to: '/inbound', label: 'Email Inbox', icon: Mail },
  { to: '/outreach', label: 'Outreach', icon: Mail },
  { to: '/inquiries', label: 'Inquiries', icon: FileQuestion },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/shipments', label: 'Shipments', icon: Ship },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/amazon', label: 'Amazon', icon: ShoppingCart },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// First N items appear directly in the mobile bottom nav, rest go in "More" sheet
export const MOBILE_PRIMARY_COUNT = 4;
