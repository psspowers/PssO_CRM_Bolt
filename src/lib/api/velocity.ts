import { supabase } from '../supabase';

// Types for velocity metrics
export interface VelocityStageData {
  stage: string;
  current_mw: number;
  wow_change: number;
  mom_change: number;
}

export interface PipelineSnapshot {
  id: string;
  snapshot_date: string;
  stage: string;
  total_value: number;
  total_count: number;
  total_capacity: number;
  created_at: string;
}

/**
 * Fetch pipeline velocity metrics from the database
 * This calls the get_pipeline_velocity() function that calculates
 * current vs last week vs last month changes
 */
export const fetchPipelineVelocity = async (): Promise<VelocityStageData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_pipeline_velocity');
    
    if (error) {
      console.warn('Pipeline velocity function not available:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch pipeline velocity:', error);
    return [];
  }
};

/**
 * Manually trigger a pipeline snapshot capture
 * This is typically run by a cron job, but can be called manually
 */
export const capturePipelineSnapshot = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('capture_pipeline_snapshot');
    
    if (error) {
      console.error('Failed to capture pipeline snapshot:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to capture pipeline snapshot:', error);
    return false;
  }
};

/**
 * Fetch historical pipeline snapshots for trend analysis
 */
export const fetchPipelineSnapshots = async (days: number = 30): Promise<PipelineSnapshot[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('pipeline_snapshots')
      .select('*')
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false });
    
    if (error) {
      console.warn('Pipeline snapshots table not available:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch pipeline snapshots:', error);
    return [];
  }
};

/**
 * Calculate velocity metrics from opportunities data (fallback)
 * Used when the database functions are not yet set up
 */
export interface FallbackVelocityMetrics {
  totalPipelineValue: number;
  activeDeals: number;
  wonDeals: number;
  wonThisPeriod: number;
  wonPreviousPeriod: number;
  totalCapacity: number;
  operationalCapacity: number;
  inConstructionCapacity: number;
  stageMovements: number;
  previousStageMovements: number;
  avgDealSize: number;
  accountsCount: number;
  partnersCount: number;
  projectsCount: number;
  // Stage-specific velocity
  stageVelocity: {
    stage: string;
    currentMw: number;
    wowChange: number;
    momChange: number;
  }[];
}

export const calculateFallbackVelocity = (
  opportunities: any[],
  projects: any[],
  accounts: any[],
  partners: any[],
  period: 'wow' | 'mom'
): FallbackVelocityMetrics => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const periodStart = period === 'wow' ? oneWeekAgo : oneMonthAgo;
  const previousPeriodStart = period === 'wow' ? twoWeeksAgo : twoMonthsAgo;
  const previousPeriodEnd = period === 'wow' ? oneWeekAgo : oneMonthAgo;

  // Current period deals
  const currentPeriodDeals = opportunities.filter(o => new Date(o.updatedAt) >= periodStart);
  const previousPeriodDeals = opportunities.filter(o => 
    new Date(o.updatedAt) >= previousPeriodStart && new Date(o.updatedAt) < previousPeriodEnd
  );

  // Pipeline value
  const totalPipelineValue = opportunities.filter(o => o.stage !== 'Lost').reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.stage)).length;
  const wonDeals = opportunities.filter(o => o.stage === 'Won').length;
  const wonThisPeriod = opportunities.filter(o => o.stage === 'Won' && new Date(o.updatedAt) >= periodStart).length;
  const wonPreviousPeriod = opportunities.filter(o => 
    o.stage === 'Won' && new Date(o.updatedAt) >= previousPeriodStart && new Date(o.updatedAt) < previousPeriodEnd
  ).length;

  // Capacity metrics
  const totalCapacity = projects.reduce((sum, p) => sum + (Number(p.capacity) || 0), 0);
  const operationalCapacity = projects.filter(p => p.status === 'Operational').reduce((sum, p) => sum + (Number(p.capacity) || 0), 0);
  const inConstructionCapacity = projects.filter(p => p.status === 'Construction').reduce((sum, p) => sum + (Number(p.capacity) || 0), 0);

  // Stage movement (velocity)
  const stageMovements = currentPeriodDeals.length;
  const previousStageMovements = previousPeriodDeals.length;

  // Average deal size
  const avgDealSize = activeDeals > 0 ? totalPipelineValue / activeDeals : 0;

  // Calculate stage-specific velocity (approximation without historical data)
  const stages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
  const stageVelocity = stages.map(stage => {
    const currentMw = opportunities
      .filter(o => o.stage === stage)
      .reduce((sum, o) => sum + (Number(o.targetCapacity) || 0), 0);
    
    // Without historical snapshots, we estimate based on recent updates
    const recentInStage = opportunities.filter(o => 
      o.stage === stage && new Date(o.updatedAt) >= periodStart
    ).reduce((sum, o) => sum + (Number(o.targetCapacity) || 0), 0);
    
    return {
      stage,
      currentMw,
      wowChange: period === 'wow' ? recentInStage * 0.1 : 0, // Rough estimate
      momChange: period === 'mom' ? recentInStage * 0.15 : 0, // Rough estimate
    };
  });

  return {
    totalPipelineValue,
    activeDeals,
    wonDeals,
    wonThisPeriod,
    wonPreviousPeriod,
    totalCapacity,
    operationalCapacity,
    inConstructionCapacity,
    stageMovements,
    previousStageMovements,
    avgDealSize,
    accountsCount: accounts.length,
    partnersCount: partners.length,
    projectsCount: projects.length,
    stageVelocity,
  };
};
