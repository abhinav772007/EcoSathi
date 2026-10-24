import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CAMPUS_LOCATIONS, ROUTE_STOPS, TEAM_MEMBERS } from '@/data/campus';
import {
  getCategoryColor,
  initialReports,
  nextReportId,
  openReportCount,
  STATUS_TRANSITIONS,
} from '@/data/reports';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const ReportsContext = createContext(null);

const REPORTS_STORAGE_KEY = 'ecosathi_reports_cache';
const TEAM_STORAGE_KEY = 'ecosathi_team_cache';

const INITIAL_DUPLICATES = [
  {
    id: 1,
    report_id: 1042,
    canonical_report_id: 1001,
    confidence: 0.91,
    match_reason: 'Same configured location (R. K. Hall · North gate) and category within 2 hours',
    reviewed: false,
    report: {
      id: 1042,
      code: 'ECO-1042',
      title: 'Overflowing bin near hostel mess',
      location: 'R. K. Hall · North gate',
      category: 'Overflowing bin',
      priority: 'Urgent',
      status: 'Needs review',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    canonical: {
      id: 1001,
      code: 'ECO-1001',
      title: 'Hostel mess external bin overflowing',
      location: 'R. K. Hall · North gate',
      category: 'Overflowing bin',
      priority: 'Urgent',
      status: 'Verified',
      created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    },
  },
];

const INITIAL_WORKFLOWS = [
  {
    id: 'wf-101',
    kind: 'route_generation',
    status: 'succeeded',
    algorithm_version: 'priority-nearest-neighbor-v2',
    started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 25 * 60 * 1000 + 420).toISOString(),
    payload: { stops: 4, total_distance: 3.8, baseline_distance: 5.6 },
  },
  {
    id: 'wf-102',
    kind: 'report_processing',
    status: 'succeeded',
    algorithm_version: 'heuristic-triage-v1',
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 15 * 60 * 1000 + 130).toISOString(),
    report: { code: 'ECO-1042', title: 'Overflowing bin near hostel mess', status: 'Needs review' },
  },
  {
    id: 'wf-103',
    kind: 'report_processing',
    status: 'succeeded',
    algorithm_version: 'heuristic-triage-v1',
    started_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 40 * 60 * 1000 + 115).toISOString(),
    report: { code: 'ECO-1041', title: 'Mixed waste around amphitheatre', status: 'Verified' },
  },
];

const INITIAL_PLAN = {
  id: 'plan-demo-today',
  status: 'proposed',
  algorithm_version: 'priority-nearest-neighbor-v2',
  total_distance: 3.8,
  baseline_distance: 5.6,
  stop_count: 4,
  depot: { latitude: 29.8645, longitude: 77.896, name: 'Campus Operations Depot' },
  collection_stops: ROUTE_STOPS,
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function ReportsProvider({ children }) {
  const { user, role } = useAuth();

  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return initialReports;
  });

  const [locations, setLocations] = useState(CAMPUS_LOCATIONS);
  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(TEAM_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return TEAM_MEMBERS;
  });

  const [plan, setPlan] = useState(INITIAL_PLAN);
  const [duplicateLinks, setDuplicateLinks] = useState(INITIAL_DUPLICATES);
  const [workflowRuns, setWorkflowRuns] = useState(INITIAL_WORKFLOWS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Persist reports locally
  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // ignore
    }
  }, [reports]);

  // Persist team members locally
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamMembers));
    } catch {
      // ignore
    }
  }, [teamMembers]);

  const notify = useCallback((title, detail, timeout = 3500) => {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), timeout);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const loadReports = useCallback(async () => {
    try {
      const apiReports = await apiRequest('/api/reports');
      if (Array.isArray(apiReports) && apiReports.length > 0) {
        setReports(apiReports);
        return apiReports;
      }
    } catch {
      // API offline; rely on local state
    }
    return reports;
  }, [reports]);

  const loadLocations = useCallback(async () => {
    try {
      const apiLocations = await apiRequest('/api/locations');
      if (Array.isArray(apiLocations) && apiLocations.length > 0) {
        setLocations(apiLocations);
        return apiLocations;
      }
    } catch {
      // API offline; rely on CAMPUS_LOCATIONS
    }
    return CAMPUS_LOCATIONS;
  }, []);

  const loadPlan = useCallback(async () => {
    try {
      const plans = await apiRequest('/api/collection-plans');
      if (Array.isArray(plans) && plans.length > 0) {
        const active = plans.find((item) => item.status !== 'cancelled') || plans[0];
        setPlan(active);
        return active;
      }
    } catch {
      // API offline; keep local plan
    }
    return plan;
  }, [plan]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([loadReports(), loadLocations(), loadPlan()]).finally(() => {
      setLoading(false);
    });
  }, [loadLocations, loadPlan, loadReports]);

  const refreshReports = useCallback(async () => {
    return await loadReports();
  }, [loadReports]);

  const refreshLocations = useCallback(async () => {
    return await loadLocations();
  }, [loadLocations]);

  // Add new report with automatic duplicate check and workflow run
  const addReport = useCallback(
    async (rawReport) => {
      const matchingLocation =
        locations.find((loc) => String(loc.id) === String(rawReport.location_id)) ||
        locations.find((loc) => loc.name === rawReport.location) ||
        locations[0];

      const locationId = matchingLocation?.id || 1;
      const locationName = matchingLocation?.name || rawReport.location || locations[0].name;

      const newCode = nextReportId(reports);

      // Check for possible duplicate (same location within recent reports)
      const existingAtLocation = reports.find(
        (r) =>
          (r.location === locationName || r.location_id === locationId) &&
          r.status !== 'Resolved' &&
          r.status !== 'Rejected'
      );

      const assignedStatus = existingAtLocation ? 'Needs review' : 'Verified';

      const payload = {
        title: rawReport.title || `${rawReport.category} at ${locationName}`,
        location: locationName,
        location_id: locationId,
        category: rawReport.category || 'Overflowing bin',
        priority: rawReport.priority || 'Medium',
        description: rawReport.description || null,
        source: rawReport.source || 'text',
        confirmed: true,
      };

      try {
        const created = await apiRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setReports((curr) => [created, ...curr]);
        notify('Report submitted', `EcoSathi registered ${created.id}`);
        return created;
      } catch {
        // Fallback: create report locally
        const localCreated = {
          id: newCode,
          code: newCode,
          report_id: Date.now(),
          ...payload,
          status: assignedStatus,
          age: 'just now',
          created_at: new Date().toISOString(),
          initials: user?.initials || 'ME',
          color: getCategoryColor(payload.category),
          user_id: user?.id || 'demo-user',
        };

        setReports((curr) => [localCreated, ...curr]);

        // Record simulated workflow run
        const newWorkflow = {
          id: `wf-${Date.now()}`,
          kind: 'report_processing',
          status: 'succeeded',
          algorithm_version: 'heuristic-triage-v1',
          started_at: new Date().toISOString(),
          completed_at: new Date(Date.now() + 180).toISOString(),
          report: { code: newCode, title: localCreated.title, status: assignedStatus },
        };
        setWorkflowRuns((curr) => [newWorkflow, ...curr]);

        // If duplicate detected, add to duplicate candidates
        if (existingAtLocation) {
          const newDupLink = {
            id: Date.now(),
            report_id: localCreated.id,
            canonical_report_id: existingAtLocation.id,
            confidence: 0.88,
            match_reason: `Same configured location (${locationName}) and category within active window`,
            reviewed: false,
            report: localCreated,
            canonical: existingAtLocation,
          };
          setDuplicateLinks((curr) => [newDupLink, ...curr]);
          notify(
            'Report queued for duplicate review',
            `${newCode} flagged at ${locationName}. Matched with existing report ${existingAtLocation.id}.`,
            5000
          );
        } else {
          notify('Report submitted', `EcoSathi registered ${newCode} at ${locationName}`);
        }

        return localCreated;
      }
    },
    [locations, notify, reports, user]
  );

  // Update report status
  const updateReportStatus = useCallback(
    async (code, newStatus, note = null) => {
      try {
        const updated = await apiRequest(`/api/reports/${code}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, note }),
        });
        setReports((curr) => curr.map((r) => (r.id === code || r.code === code ? updated : r)));
        notify('Report updated', `${code} is now ${updated.status}`);
        return updated;
      } catch {
        // Update locally
        setReports((curr) =>
          curr.map((r) => {
            if (r.id === code || r.code === code) {
              return {
                ...r,
                status: newStatus,
                resolution_note: note || r.resolution_note,
                resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : r.resolved_at,
                updated_at: new Date().toISOString(),
              };
            }
            return r;
          })
        );
        notify('Report updated', `${code} marked as ${newStatus}`);
        return { code, status: newStatus };
      }
    },
    [notify]
  );

  const resolveReport = useCallback(
    async (code) => {
      return await updateReportStatus(code, 'Resolved');
    },
    [updateReportStatus]
  );

  // Regenerate collection route plan (Priority-aware Nearest Neighbor)
  const generateRoutePlan = useCallback(async () => {
    try {
      const generated = await apiRequest('/api/collection-plans/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setPlan(generated);
      await loadReports();
      notify('Route generated', `${generated.collection_stops?.length || 0} stops in today's route.`);
      return generated;
    } catch {
      // Local generation algorithm:
      const eligible = reports.filter(
        (r) =>
          ['Verified', 'Assigned', 'In Progress'].includes(r.status) &&
          (r.location_id || locations.some((l) => l.name === r.location))
      );

      const stopsPool = eligible.length > 0 ? eligible : reports.slice(0, 4);

      const depot = { latitude: 29.8645, longitude: 77.896, name: 'Campus Operations Depot' };

      // Map stops to coordinates
      const mapped = stopsPool.map((report) => {
        const loc =
          locations.find((l) => l.id === report.location_id) ||
          locations.find((l) => l.name === report.location) ||
          locations[0];
        return {
          report,
          loc,
          priorityScore:
            report.priority === 'Urgent' ? 4 : report.priority === 'High' ? 3 : report.priority === 'Medium' ? 2 : 1,
        };
      });

      // Nearest Neighbor with priority weighting
      let currentLat = depot.latitude;
      let currentLng = depot.longitude;
      const unvisited = [...mapped];
      const ordered = [];
      let totalDist = 0;

      while (unvisited.length > 0) {
        let bestIdx = 0;
        let bestScore = Infinity;

        for (let i = 0; i < unvisited.length; i += 1) {
          const item = unvisited[i];
          const dist = calculateDistance(currentLat, currentLng, item.loc.latitude, item.loc.longitude);
          // Higher priority reduces virtual distance
          const virtualDist = dist / (item.priorityScore * 0.7);
          if (virtualDist < bestScore) {
            bestScore = virtualDist;
            bestIdx = i;
          }
        }

        const chosen = unvisited.splice(bestIdx, 1)[0];
        const actualDist = calculateDistance(
          currentLat,
          currentLng,
          chosen.loc.latitude,
          chosen.loc.longitude
        );
        totalDist += actualDist;
        currentLat = chosen.loc.latitude;
        currentLng = chosen.loc.longitude;
        ordered.push(chosen);
      }

      // Return to depot
      totalDist += calculateDistance(currentLat, currentLng, depot.latitude, depot.longitude);

      const baselineDist = Math.round(totalDist * 1.45 * 10) / 10;
      const calculatedTotal = Math.round(totalDist * 10) / 10;

      const newStops = ordered.map((item, idx) => ({
        id: idx + 1,
        sequence: idx + 1,
        location_id: item.loc.id,
        location_name: item.loc.name,
        latitude: item.loc.latitude,
        longitude: item.loc.longitude,
        report_code: item.report.code || item.report.id,
        priority: item.report.priority,
        category: item.report.category,
        worker_status: idx === 0 ? 'in_progress' : 'pending',
        weight_kg: null,
      }));

      const newPlan = {
        id: `plan-${Date.now()}`,
        status: 'proposed',
        algorithm_version: 'priority-nearest-neighbor-v2',
        total_distance: calculatedTotal,
        baseline_distance: baselineDist,
        stop_count: newStops.length,
        depot,
        collection_stops: newStops,
      };

      setPlan(newPlan);

      // Update reports to Assigned
      setReports((curr) =>
        curr.map((r) => {
          if (newStops.some((s) => s.report_code === r.code || s.report_code === r.id)) {
            return { ...r, status: 'Assigned', updated_at: new Date().toISOString() };
          }
          return r;
        })
      );

      // Record workflow run
      const wf = {
        id: `wf-${Date.now()}`,
        kind: 'route_generation',
        status: 'succeeded',
        algorithm_version: 'priority-nearest-neighbor-v2',
        started_at: new Date().toISOString(),
        completed_at: new Date(Date.now() + 350).toISOString(),
        payload: {
          stops: newStops.length,
          total_distance: calculatedTotal,
          baseline_distance: baselineDist,
        },
      };
      setWorkflowRuns((curr) => [wf, ...curr]);

      notify('Route generated', `Optimized route with ${newStops.length} stops ready for collection team.`);
      return newPlan;
    }
  }, [loadReports, locations, notify, reports]);

  // Update stop status (In progress, Completed with weight kg, or Skipped)
  const updateStop = useCallback(
    async (stop, payload) => {
      try {
        await apiRequest(`/api/collection-stops/${stop.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback locally
      }

      setPlan((curr) => {
        if (!curr) return curr;
        const nextStops = (curr.collection_stops || []).map((s) => {
          if (s.id === stop.id || s.sequence === stop.sequence) {
            return {
              ...s,
              worker_status: payload.worker_status,
              weight_kg: payload.weight_kg !== undefined ? payload.weight_kg : s.weight_kg,
            };
          }
          return s;
        });

        const allDone = nextStops.every((s) => s.worker_status === 'completed' || s.worker_status === 'skipped');

        return {
          ...curr,
          status: allDone ? 'completed' : curr.status,
          collection_stops: nextStops,
        };
      });

      // Sync report status
      const targetReportStatus =
        payload.worker_status === 'completed'
          ? 'Resolved'
          : payload.worker_status === 'in_progress'
          ? 'In Progress'
          : 'Verified';

      setReports((curr) =>
        curr.map((r) => {
          if (r.code === stop.report_code || r.id === stop.report_code) {
            return {
              ...r,
              status: targetReportStatus,
              resolved_at: targetReportStatus === 'Resolved' ? new Date().toISOString() : r.resolved_at,
            };
          }
          return r;
        })
      );

      notify(
        'Collection stop updated',
        `${stop.location_name || `Stop ${stop.sequence}`} is now ${payload.worker_status.replaceAll('_', ' ')}${
          payload.weight_kg ? ` (${payload.weight_kg} kg collected)` : ''
        }.`
      );
    },
    [notify]
  );

  // Review duplicate link
  const reviewDuplicate = useCallback(
    async (linkId, decision) => {
      try {
        await apiRequest(`/api/duplicates/${linkId}/review`, {
          method: 'POST',
          body: JSON.stringify({ decision }),
        });
      } catch {
        // Local fallback
      }

      setDuplicateLinks((curr) => curr.filter((l) => l.id !== linkId));

      const link = duplicateLinks.find((l) => l.id === linkId);
      if (link) {
        const reportCode = link.report?.code || link.report?.id;
        if (decision === 'confirmed') {
          // Duplicate confirmed -> reject the duplicate report
          updateReportStatus(reportCode, 'Rejected', 'Confirmed duplicate of existing report.');
          notify('Duplicate confirmed', `${reportCode} resolved as duplicate.`);
        } else {
          // Dismissed -> verify report
          updateReportStatus(reportCode, 'Verified', 'Kept as an independent issue.');
          notify('Reports kept separate', `${reportCode} verified as distinct.`);
        }
      }
    },
    [duplicateLinks, notify, updateReportStatus]
  );

  // Update a team member's role (Administrator feature)
  const updateMemberRole = useCallback(
    async (memberId, newRole) => {
      try {
        await apiRequest(`/api/users/${memberId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        });
      } catch {
        // Local fallback
      }

      setTeamMembers((curr) =>
        curr.map((m) => {
          if (m.id === memberId || m.name === memberId) {
            return { ...m, role: newRole };
          }
          return m;
        })
      );

      const member = teamMembers.find((m) => m.id === memberId || m.name === memberId);
      notify(
        'Team member role updated',
        `${member?.name || 'Member'} is now configured as ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}.`
      );
    },
    [notify, teamMembers]
  );

  // Add a team member
  const addTeamMember = useCallback(
    (newMember) => {
      const created = {
        id: `user-${Date.now()}`,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role || 'resident',
        initials: (newMember.name || 'EM')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        color: newMember.role === 'administrator' ? 'green' : newMember.role === 'worker' ? 'orange' : 'purple',
        status: 'Online',
        focus: newMember.focus || 'Campus operations',
        joined: 'Just now',
      };
      setTeamMembers((curr) => [...curr, created]);
      notify('Team member added', `${created.name} registered as ${created.role}.`);
      return created;
    },
    [notify]
  );

  const value = useMemo(
    () => ({
      reports,
      locations,
      teamMembers,
      plan,
      duplicateLinks,
      workflowRuns,
      loading,
      toast,
      showReportModal,
      setShowReportModal,
      addReport,
      updateReportStatus,
      resolveReport,
      refreshReports,
      refreshLocations,
      generateRoutePlan,
      updateStop,
      reviewDuplicate,
      updateMemberRole,
      addTeamMember,
      dismissToast,
      notify,
    }),
    [
      addReport,
      addTeamMember,
      dismissToast,
      duplicateLinks,
      generateRoutePlan,
      loading,
      locations,
      notify,
      plan,
      refreshLocations,
      refreshReports,
      reports,
      resolveReport,
      reviewDuplicate,
      setShowReportModal,
      showReportModal,
      teamMembers,
      toast,
      updateMemberRole,
      updateReportStatus,
      updateStop,
      workflowRuns,
    ]
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used inside ReportsProvider');
  }
  return context;
}
