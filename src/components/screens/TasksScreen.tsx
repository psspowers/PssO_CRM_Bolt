import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Clock, Loader2, User, Target, ChevronDown, Hand, Zap, Users, Search, X, Filter, Info, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskThread {
  id: string;
  summary: string;
  details?: string;
  status?: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assignedToId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  parentTaskId?: string;
  depth: number;
  createdAt: string;
  children?: TaskThread[];
}

interface DealGroup {
  deal: {
    id: string;
    name: string;
    stage: string;
    value: number;
    account_name: string;
  };
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: TaskThread[];
}

const getStageConfig = (stage: string) => {
  const configs: Record<string, { char: string; color: string; label: string }> = {
    'Prospect': { char: '', color: 'bg-slate-300', label: 'Prospect' },
    'Qualified': { char: 'Q', color: 'bg-blue-500', label: 'Qualified' },
    'Proposal': { char: 'P', color: 'bg-amber-500', label: 'Proposal' },
    'Negotiation': { char: 'N', color: 'bg-purple-500', label: 'Negotiation' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500', label: 'Term Sheet' },
    'Won': { char: 'W', color: 'bg-green-500', label: 'Won' }
  };
  return configs[stage] || { char: '', color: 'bg-slate-300', label: stage };
};

export const TasksScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { users } = useAppContext();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());

  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [myTasksCount, setMyTasksCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSubordinates = async () => {
      setLoadingSubordinates(true);
      try {
        const { data, error } = await supabase
          .from('user_hierarchy')
          .select('subordinate_id')
          .eq('manager_id', user.id);

        if (error) {
          console.error('Error fetching subordinates:', error);
          setSubordinateIds([]);
        } else {
          const ids = data?.map(row => row.subordinate_id) || [];
          setSubordinateIds(ids);
        }
      } catch (err) {
        console.error('Failed to fetch subordinates:', err);
        setSubordinateIds([]);
      } finally {
        setLoadingSubordinates(false);
      }
    };

    fetchSubordinates();
  }, [user?.id]);

  useEffect(() => {
    if (hierarchyView === 'mine') setSelectedMemberId('all');
  }, [hierarchyView]);

  const teamMembers = useMemo(() => {
    if (isAdmin) {
      return users.filter(u => ['internal', 'admin', 'super_admin'].includes(u.role));
    } else {
      return users.filter(u => subordinateIds.includes(u.id) || u.id === user?.id);
    }
  }, [users, subordinateIds, isAdmin, user]);

  const formatShortName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const fetchCounts = async () => {
    if (!user?.id) return;

    try {
      const { data: myData } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: 'mine'
      });
      const myCount = myData?.reduce((sum: number, group: DealGroup) => sum + group.total_tasks, 0) || 0;
      setMyTasksCount(myCount);

      const { data: teamData } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: 'all'
      });
      const teamCount = teamData?.reduce((sum: number, group: DealGroup) => sum + group.total_tasks, 0) || 0;
      setTeamTasksCount(teamCount);
    } catch (error) {
      console.error('Error fetching task counts:', error);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [user?.id]);

  const filteredDealGroups = useMemo(() => {
    if (!search.trim()) return dealGroups;

    const searchLower = search.toLowerCase();
    return dealGroups
      .map(group => ({
        ...group,
        tasks: group.tasks.filter(task =>
          task.summary.toLowerCase().includes(searchLower) ||
          task.details?.toLowerCase().includes(searchLower) ||
          task.assigneeName?.toLowerCase().includes(searchLower) ||
          group.deal.name.toLowerCase().includes(searchLower) ||
          group.deal.account_name.toLowerCase().includes(searchLower)
        )
      }))
      .filter(group => group.tasks.length > 0);
  }, [dealGroups, search]);

  const fetchTaskThreads = async () => {
    setLoading(true);
    try {
      const filterParam = hierarchyView === 'mine' ? 'mine' : 'all';
      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user?.id || null,
        p_filter: filterParam
      });

      if (error) throw error;

      let filteredData = data || [];

      if (hierarchyView === 'team' && selectedMemberId !== 'all') {
        filteredData = filteredData.map(group => ({
          ...group,
          tasks: group.tasks.filter((t: TaskThread) => t.assignedToId === selectedMemberId),
          completed_tasks: group.tasks.filter((t: TaskThread) =>
            t.assignedToId === selectedMemberId && t.status === 'Completed'
          ).length,
          total_tasks: group.tasks.filter((t: TaskThread) => t.assignedToId === selectedMemberId).length
        })).filter(group => group.total_tasks > 0);
      }

      setDealGroups(filteredData);
    } catch (error: any) {
      console.error('Error fetching task threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task threads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskThreads();
  }, [hierarchyView, selectedMemberId, user?.id]);

  const toggleTask = async (taskId: string, currentStatus?: string) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      const { error } = await supabase
        .from('activities')
        .update({ task_status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: newStatus === 'Completed' ? 'Task Completed' : 'Task Reopened',
        description: newStatus === 'Completed' ? 'Great work!' : 'Task marked as pending'
      });

      fetchTaskThreads();
      fetchCounts();
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  const pickupTask = async (taskId: string, taskSummary: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ assigned_to_id: user.id })
        .eq('id', taskId);

      if (updateError) throw updateError;

      const { error: wattsError } = await supabase
        .from('watts_ledger')
        .insert({
          user_id: user.id,
          amount: 5,
          type: 'pickup_task',
          description: `Picked up task: ${taskSummary}`,
          related_entity_id: taskId,
          related_entity_type: 'Activity'
        });

      if (wattsError) throw wattsError;

      toast({
        title: 'Task Picked Up!',
        description: '+5 Watts earned for taking initiative',
        className: 'bg-green-50 border-green-200'
      });

      fetchTaskThreads();
    } catch (error: any) {
      console.error('Error picking up task:', error);
      toast({
        title: 'Error',
        description: 'Failed to pickup task',
        variant: 'destructive'
      });
    }
  };

  const addSubtask = async (parentTaskId: string, dealId: string) => {
    const summary = prompt('Enter subtask name:');
    if (!summary?.trim()) return;

    try {
      const { error } = await supabase.from('activities').insert({
        type: 'Task',
        summary,
        task_status: 'Pending',
        related_to_id: dealId,
        related_to_type: 'opportunity',
        assigned_to_id: user?.id,
        parent_task_id: parentTaskId,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: 'Subtask Added',
        description: 'New subtask created successfully',
        className: 'bg-green-50 border-green-200'
      });

      fetchTaskThreads();
      setExpandedTasks(prev => new Set(prev).add(parentTaskId));
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      toast({
        title: 'Error',
        description: 'Failed to add subtask',
        variant: 'destructive'
      });
    }
  };

  const buildTaskTree = (tasks: TaskThread[]): TaskThread[] => {
    const taskMap = new Map<string, TaskThread & { children: TaskThread[] }>();
    const roots: (TaskThread & { children: TaskThread[] })[] = [];

    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
        taskMap.get(task.parentTaskId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleDealExpanded = (dealId: string) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  const renderTask = (task: TaskThread & { children?: TaskThread[] }, dealId: string, depth: number = 0, isLast: boolean = false): React.ReactNode => {
    const isCompleted = task.status === 'Completed';
    const isMine = task.assignedToId === user?.id;
    const isExpanded = expandedTasks.has(task.id);
    const hasChildren = task.children && task.children.length > 0;
    const isUnassigned = !task.assignedToId;

    return (
      <div key={task.id} className="relative">
        {depth > 0 && (
          <>
            <div
              className="absolute left-0 top-0 w-px bg-slate-200"
              style={{
                left: `${(depth - 1) * 24 + 12}px`,
                height: isLast ? '24px' : '100%'
              }}
            />
            <div
              className="absolute top-6 h-px bg-slate-200"
              style={{
                left: `${(depth - 1) * 24 + 12}px`,
                width: '12px'
              }}
            />
          </>
        )}

        <div
          className="flex items-center gap-2 py-1.5"
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(task.id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          )}

          {!hasChildren && depth > 0 && <div className="w-5" />}

          <button
            onClick={() => toggleTask(task.id, task.status)}
            className="flex-shrink-0"
          >
            {isCompleted ? (
              <CheckSquare className="w-4 h-4 text-green-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <div
            className={`flex-1 min-w-0 px-2 py-1 rounded ${
              isMine && !isCompleted ? 'bg-yellow-100' : ''
            } ${isCompleted ? 'opacity-60' : ''}`}
          >
            <span className={`text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {task.summary}
            </span>
          </div>

          <button
            onClick={() => addSubtask(task.id, dealId)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>

          {isUnassigned && (
            <button
              onClick={() => pickupTask(task.id, task.summary)}
              className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors border border-amber-200 flex-shrink-0"
            >
              <Hand className="w-3 h-3" />
              Pickup
              <Zap className="w-3 h-3 text-amber-500" />
            </button>
          )}

          {!isUnassigned && (
            <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
              <User className="w-3 h-3" />
              {task.assigneeName || 'Unknown'}
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {task.children!.map((child, idx) =>
              renderTask(child, dealId, depth + 1, idx === task.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">
                      <strong>Mine:</strong> Your tasks<br />
                      <strong>Team:</strong> Your tasks + subordinates' tasks
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setHierarchyView('mine')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'mine'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mine</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {myTasksCount}
                </span>
              </button>
              <button
                onClick={() => setHierarchyView('team')}
                disabled={loadingSubordinates}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'team'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                } ${loadingSubordinates ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Team</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {loadingSubordinates ? '...' : teamTasksCount}
                </span>
              </button>
            </div>

            {hierarchyView === 'team' && (
              <div className="relative flex-shrink-0 animate-in fade-in slide-in-from-left-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-700 text-xs font-bold pl-2 pr-6 py-1.5 rounded-full border-none focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none w-28 truncate"
                >
                  <option value="all">All Team</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{formatShortName(m.name)}</option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredDealGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No tasks found</p>
          <p className="text-xs mt-1">{search ? 'Try a different search' : 'Create tasks from the Deals screen'}</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filteredDealGroups.map(group => {
            const stageConfig = getStageConfig(group.deal.stage);
            const taskTree = buildTaskTree(group.tasks);
            const isDealExpanded = expandedDeals.has(group.deal.id);

            return (
              <div key={group.deal.id} className="py-4 border-b border-slate-100">
                <button
                  onClick={() => toggleDealExpanded(group.deal.id)}
                  className="w-full flex items-center gap-3 mb-2 hover:bg-slate-50 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {stageConfig.char}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-bold text-slate-900 truncate">{group.deal.name}</h3>
                    <p className="text-xs text-slate-500">{group.deal.account_name}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-slate-600">
                      {group.completed_tasks}/{group.total_tasks}
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                      isDealExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDealExpanded && (
                  <div className="pl-13 space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={group.progress} className="h-1 flex-1" />
                    </div>

                    {taskTree.length > 0 && (
                      <div className="mt-3 space-y-0">
                        {taskTree.map((task, idx) =>
                          renderTask(task, group.deal.id, 0, idx === taskTree.length - 1)
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
