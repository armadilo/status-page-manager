// StatusPageIncident represents an incident from the StatusPage API
export interface StatusPageIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string;
  created_at: string;
  updated_at: string;
  components?: { id: string; name: string; status: string }[];
}

// StatusPageComponent represents a component from the StatusPage API
export interface StatusPageComponent {
  id: string;
  name: string;
  status: string;
  description?: string;
  position?: number;
  group_id?: string;
  created_at?: string;
  updated_at?: string;
}

// CreateIncidentParams for creating a new incident
export interface CreateIncidentParams {
  name: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'critical' | 'major' | 'minor' | 'maintenance';
  message: string;
  notify: boolean;
  components?: Array<{
    id: string;
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  }>;
}

// UpdateIncidentParams for updating an existing incident
export interface UpdateIncidentParams {
  incidentId: string;
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact?: 'critical' | 'major' | 'minor' | 'maintenance';
  message?: string;
  name?: string;
  components?: Array<{
    id: string;
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  }>;
}

// ListIncidentsParams for filtering incidents
export interface ListIncidentsParams {
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  limit?: number;
}

// Component status types
export type ComponentStatus = 
  'operational' | 
  'degraded_performance' | 
  'partial_outage' | 
  'major_outage' | 
  'under_maintenance';

// Incident status types
export type IncidentStatus = 
  'investigating' | 
  'identified' | 
  'monitoring' | 
  'resolved';

// Incident impact types
export type IncidentImpact = 
  'critical' | 
  'major' | 
  'minor' | 
  'maintenance'; 