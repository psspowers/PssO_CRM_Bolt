// Database row types matching Supabase schema - Phase 1 MVP
export interface DbPartner {
  id: string; name: string; region: string; country: string; owner_id: string;
  email: string; phone: string; clickup_link?: string;
  notes?: string; created_at: string; updated_at: string;
}

export interface DbAccount {
  id: string;
  name: string;
  country: string;
  // Thai Taxonomy Classification
  sector: string;
  industry?: string;
  sub_industry?: string;
  // Other fields
  strategic_importance: string;
  clickup_link?: string;
  notes?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbContact {
  id: string; full_name: string; role: string; account_id?: string; partner_id?: string;
  email: string; phone: string; country: string; city: string; tags: string[];
  relationship_notes?: string; clickup_link?: string; avatar?: string;
  created_at: string; updated_at: string;
}

export interface DbOpportunity {
  id: string; name: string; account_id?: string; linked_account_id?: string;
  value?: number; value_usd?: number; stage: string;
  priority: string; owner_id: string; next_action?: string; next_action_date?: string;
  clickup_link?: string; notes?: string; target_capacity?: number; target_capacity_mw?: number;
  re_type: string; target_decision_date?: string;
  // Thai Taxonomy Classification
  sector?: string;
  industry?: string;
  sub_industry?: string;
  // Investor Hub Fields
  completed_milestones?: string[];
  lost_reason?: string;
  operating_days?: string[];
  daytime_load_kw?: number;
  is_24_hours?: boolean;
  bankability_score?: number;
  // Counterparty Risk Profile (Credit Committee)
  risk_profile?: Record<string, any>;
  // Other fields
  created_at: string; updated_at: string;
}



export interface DbProject {
  id: string; name: string; linked_account_id: string; country: string;
  capacity?: number; capacity_mw?: number; // Support both old and new column names
  status: string; owner_id: string; clickup_link?: string; notes?: string;
  created_at: string; updated_at: string;
}


export interface DbActivity {
  id: string; 
  type: string; 
  summary: string; 
  details?: string; 
  related_to_id: string;
  related_to_type: string; 
  created_by: string;  // Note: column is 'created_by', not 'created_by_id'
  created_at: string;
  updated_at?: string;
  attachments?: string[]; 
  tags?: string[]; 
  clickup_link?: string;
  mentions?: string[];
  // Task fields
  is_task?: boolean;
  assigned_to_id?: string;
  due_date?: string;
  task_status?: string;
  priority?: string;
}


export interface DbRelationship {
  id: string; from_entity_id: string; from_entity_type: string; to_entity_id: string;
  to_entity_type: string; type: string; strength: string; notes?: string;
}

export interface DbUser {
  id: string; name: string; email: string; role: string; avatar?: string; badges: string[];
  reports_to?: string;
}
