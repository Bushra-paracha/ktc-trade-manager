import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Package,
  CheckSquare,
  BarChart3,
  Settings,
  Inbox,
  Mail,
  FileQuestion,
  Ship,
  FolderOpen,
  ShoppingCart,
  Truck,
  Globe,
  Shield,
  KanbanSquare,
} from 'lucide-react';

export const navGroups = [
  {
    label: 'Home',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Buyers',
    items: [
      { to: '/clients', label: 'Buyer CRM', icon: Users },
      { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
      { to: '/inquiries', label: 'Inquiries', icon: FileQuestion },
      { to: '/inbox', label: 'Quote Inbox', icon: Inbox },
      { to: '/inbound', label: 'Email Inbox', icon: Mail },
      { to: '/outreach', label: 'Outreach', icon: Mail },
    ],
  },
  {
    label: 'Orders',
    items: [
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      { to: '/shipments', label: 'Shipments', icon: Ship },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Products',
    items: [
      { to: '/products', label: 'Product Catalog', icon: Package },
      { to: '/amazon', label: 'Amazon Packs', icon: ShoppingCart },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/reexport', label: 'Re-export Traders', icon: Globe },
      { to: '/policies', label: 'Policies & SLAs', icon: Shield },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Reports', icon: BarChart3 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Flat list remains available for mobile bottom nav and any existing imports.
export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Buyers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/analytics', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MOBILE_PRIMARY_COUNT = 4;
