import { Activity, Bell, GitMerge, Leaf, MapPin, Route, TrendingUp, Users } from 'lucide-react';

export const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Overview', path: '/', icon: TrendingUp },
      { id: 'reports', label: 'Reports', path: '/reports', icon: Bell, badgeKey: 'openReports' },
      { id: 'route', label: 'Collection route', path: '/route', icon: Route, roles: ['administrator', 'worker'] },
      { id: 'impact', label: 'Impact', path: '/impact', icon: Leaf, roles: ['administrator', 'worker'] },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { id: 'duplicates', label: 'Duplicates', path: '/duplicates', icon: GitMerge, roles: ['administrator', 'worker'] },
      { id: 'workflows', label: 'Workflows', path: '/workflows', icon: Activity, roles: ['administrator', 'worker'] },
      { id: 'team', label: 'Team', path: '/team', icon: Users, roles: ['administrator'] },
      { id: 'locations', label: 'Locations', path: '/locations', icon: MapPin },
    ],
  },
];

export function pageLabelFromPath(pathname) {
  const match = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.path === pathname);
  return match?.label ?? 'Overview';
}

export function canAccess(item, role) {
  return !item.roles || item.roles.includes(role);
}
