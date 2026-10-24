export const REPORT_STATUSES = [
  'All reports',
  'Submitted',
  'Needs review',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
];

export const CATEGORIES = [
  'Overflowing bin',
  'Scattered waste',
  'Missed pickup',
  'Disposal question',
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const initialReports = [
  {
    id: 'ECO-1042',
    report_id: 1042,
    code: 'ECO-1042',
    title: 'Overflowing bin near hostel mess',
    location: 'R. K. Hall · North gate',
    location_id: 1,
    category: 'Overflowing bin',
    priority: 'Urgent',
    status: 'Needs review',
    description: 'Mess bin has been overflowing since morning. Stray animals are gathering.',
    source: 'voice',
    confirmed: true,
    age: '12 min ago',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    initials: 'AS',
    color: 'coral',
    user_id: 'user-resident',
  },
  {
    id: 'ECO-1041',
    report_id: 1041,
    code: 'ECO-1041',
    title: 'Mixed waste around the amphitheatre',
    location: 'Main amphitheatre',
    location_id: 2,
    category: 'Scattered waste',
    priority: 'High',
    status: 'Verified',
    description: 'Post-event litter including paper cups and plastic containers spread across seating.',
    source: 'text',
    confirmed: true,
    age: '38 min ago',
    created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    initials: 'MP',
    color: 'orange',
    user_id: 'user-reviewer',
  },
  {
    id: 'ECO-1040',
    report_id: 1040,
    code: 'ECO-1040',
    title: 'Missed pickup from science block',
    location: 'Science block · Dock 2',
    location_id: 3,
    category: 'Missed pickup',
    priority: 'Medium',
    status: 'Assigned',
    description: 'The scheduled 2 PM cardboard and recyclable collection was not completed.',
    source: 'text',
    confirmed: true,
    age: '1 hr ago',
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    initials: 'RK',
    color: 'blue',
    user_id: 'user-worker',
  },
  {
    id: 'ECO-1039',
    report_id: 1039,
    code: 'ECO-1039',
    title: 'Where can I dispose of e-waste?',
    location: 'Rajendra Bhawan',
    location_id: 4,
    category: 'Disposal question',
    priority: 'Low',
    status: 'Resolved',
    description: 'Resident asked where to drop old laptop batteries. Advised Computer Centre desk.',
    source: 'voice',
    confirmed: true,
    age: '2 hrs ago',
    created_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    initials: 'NJ',
    color: 'purple',
    user_id: 'user-resident-2',
  },
  {
    id: 'ECO-1043',
    report_id: 1043,
    code: 'ECO-1043',
    title: 'Overflowing bin near outpatient clinic',
    location: 'Institute hospital',
    location_id: 6,
    category: 'Overflowing bin',
    priority: 'High',
    status: 'Resolved',
    description: 'Outdoor bin full beside visitor walkway.',
    source: 'voice',
    confirmed: true,
    age: '3 hrs ago',
    created_at: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    initials: 'AK',
    color: 'coral',
    user_id: 'user-admin',
  },
  {
    id: 'ECO-1044',
    report_id: 1044,
    code: 'ECO-1044',
    title: 'Litter beside central library steps',
    location: 'Central library',
    location_id: 5,
    category: 'Scattered waste',
    priority: 'Medium',
    status: 'Verified',
    description: 'Plastic coffee cups and wrapper debris on steps.',
    source: 'text',
    confirmed: true,
    age: '4 hrs ago',
    created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    initials: 'AS',
    color: 'orange',
    user_id: 'user-resident',
  },
];

export function nextReportId(reports = []) {
  const numbers = reports
    .map((report) => {
      const code = report.id || report.code || '';
      return Number(code.replace('ECO-', ''));
    })
    .filter(Number.isFinite);
  const max = numbers.length ? Math.max(...numbers) : 1044;
  return `ECO-${max + 1}`;
}

export const STATUS_TRANSITIONS = {
  Submitted: ['Needs review', 'Verified', 'Rejected'],
  'Needs review': ['Verified', 'Rejected'],
  Verified: ['Assigned', 'In Progress', 'Resolved', 'Rejected'],
  Assigned: ['In Progress', 'Resolved', 'Verified', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: ['Verified'],
  Rejected: ['Needs review', 'Verified'],
};

export function allowedStatuses(status, role) {
  if (role === 'resident') return [];
  const options = STATUS_TRANSITIONS[status] || [];
  if (role === 'worker') return options.filter((item) => ['In Progress', 'Resolved'].includes(item));
  return options;
}

export function statusClassName(status = '') {
  return status.toLowerCase().replaceAll(' ', '-');
}

export function openReportCount(reports = []) {
  return reports.filter((report) => report.status !== 'Resolved' && report.status !== 'Rejected').length;
}

export function getCategoryColor(category) {
  switch (category) {
    case 'Overflowing bin':
      return 'coral';
    case 'Scattered waste':
      return 'orange';
    case 'Missed pickup':
      return 'blue';
    case 'Disposal question':
      return 'purple';
    default:
      return 'green';
  }
}
