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
    title: 'Overflowing bin near hostel mess',
    location: 'R. K. Hall · North gate',
    category: 'Overflowing bin',
    priority: 'Urgent',
    status: 'Needs review',
    age: '12 min ago',
    initials: 'AS',
    color: 'coral',
  },
  {
    id: 'ECO-1041',
    title: 'Mixed waste around the amphitheatre',
    location: 'Main amphitheatre',
    category: 'Scattered waste',
    priority: 'High',
    status: 'Verified',
    age: '38 min ago',
    initials: 'MP',
    color: 'blue',
  },
  {
    id: 'ECO-1040',
    title: 'Missed pickup from science block',
    location: 'Science block · Dock 2',
    category: 'Missed pickup',
    priority: 'Medium',
    status: 'Assigned',
    age: '1 hr ago',
    initials: 'RK',
    color: 'purple',
  },
  {
    id: 'ECO-1039',
    title: 'Where can I dispose of e-waste?',
    location: 'Rajendra Bhawan',
    category: 'Disposal question',
    priority: 'Low',
    status: 'Resolved',
    age: '2 hrs ago',
    initials: 'NJ',
    color: 'green',
  },
];

export function nextReportId(reports) {
  const numbers = reports.map((report) => Number(report.id.replace('ECO-', ''))).filter(Number.isFinite);
  const max = numbers.length ? Math.max(...numbers) : 1042;
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

export function statusClassName(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

export function openReportCount(reports) {
  return reports.filter((report) => report.status !== 'Resolved' && report.status !== 'Rejected').length;
}
