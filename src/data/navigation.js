import { Bell, Leaf, MapPin, Route, TrendingUp, Users } from 'lucide-react';

export const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Overview', path: '/', icon: TrendingUp },
      { id: 'reports', label: 'Reports', path: '/reports', icon: Bell, badgeKey: 'openReports' },
      { id: 'route', label: 'Collection route', path: '/route', icon: Route },
      { id: 'impact', label: 'Impact', path: '/impact', icon: Leaf },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { id: 'team', label: 'Team', path: '/team', icon: Users },
      { id: 'locations', label: 'Locations', path: '/locations', icon: MapPin },
    ],
  },
];

export function pageLabelFromPath(pathname) {
  const match = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.path === pathname);
  return match?.label ?? 'Overview';
}
