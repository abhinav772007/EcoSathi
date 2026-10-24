export const WORKSPACE = {
  name: 'IIT Roorkee',
  unit: 'Campus operations',
  initials: 'IR',
};

export const CURRENT_USER = {
  name: 'Ananya Kapoor',
  role: 'Administrator',
  initials: 'AK',
};

export const LOCATIONS = [
  'R. K. Hall · North gate',
  'Main amphitheatre',
  'Science block · Dock 2',
  'Rajendra Bhawan',
  'Central library',
];

export const CAMPUS_LOCATIONS = [
  { name: 'R. K. Hall · North gate', zone: 'Hostel zone', bins: 4, openReports: 2, status: 'Needs attention' },
  { name: 'Main amphitheatre', zone: 'North campus', bins: 3, openReports: 1, status: 'Verified stop' },
  { name: 'Science block · Dock 2', zone: 'Academic', bins: 2, openReports: 1, status: 'Assigned' },
  { name: 'Rajendra Bhawan', zone: 'Hostel zone', bins: 3, openReports: 0, status: 'Clear' },
  { name: 'Central library', zone: 'Academic', bins: 2, openReports: 0, status: 'Clear' },
];

export const TEAM_MEMBERS = [
  { name: 'Ananya Kapoor', role: 'Administrator', initials: 'AK', color: 'green', status: 'Online', focus: 'Queue review and assignments' },
  { name: 'Rajesh Kumar', role: 'Collection worker', initials: 'RK', color: 'orange', status: 'On route', focus: 'North campus · 12 stops' },
  { name: 'Meera Patel', role: 'Operations reviewer', initials: 'MP', color: 'blue', status: 'Online', focus: 'Duplicate matches' },
  { name: 'Neeraj Joshi', role: 'Resident reporter', initials: 'NJ', color: 'purple', status: 'Away', focus: 'Disposal questions' },
];

export const ROUTE_STOPS = [
  { location: 'R. K. Hall · North gate', issue: 'Urgent · Overflowing bin', eta: '120m', state: 'next' },
  { location: 'Main amphitheatre', issue: 'High · Scattered waste', eta: '8 min', state: 'upcoming' },
  { location: 'Science block · Dock 2', issue: 'Medium · Pickup', eta: '12 min', state: 'upcoming' },
  { location: 'Rajendra Bhawan', issue: 'Medium · Pickup', eta: '16 min', state: 'upcoming' },
  { location: 'Central library', issue: 'Medium · Pickup', eta: '20 min', state: 'upcoming' },
];

export const MAP_MARKERS = [
  { x: '22%', y: '70%', n: '1' },
  { x: '37%', y: '50%', n: '2' },
  { x: '53%', y: '62%', n: '3', urgent: true },
  { x: '68%', y: '35%', n: '4' },
  { x: '82%', y: '48%', n: '5' },
];

export const CHART_DATA = [
  { day: 'Mon', reports: 32, resolved: 24 },
  { day: 'Tue', reports: 41, resolved: 31 },
  { day: 'Wed', reports: 35, resolved: 29 },
  { day: 'Thu', reports: 48, resolved: 39 },
  { day: 'Fri', reports: 44, resolved: 40 },
  { day: 'Sat', reports: 27, resolved: 25 },
  { day: 'Sun', reports: 30, resolved: 28 },
];

export const IMPACT_BARS = [43, 55, 49, 61, 58, 75, 68, 82, 77, 90, 84, 96];

export const MATERIAL_BREAKDOWN = [
  { label: 'Organic', amount: '68 kg', tone: 'green' },
  { label: 'Recyclable', amount: '51 kg', tone: 'blue' },
  { label: 'E-waste', amount: '23 kg', tone: 'orange' },
];
