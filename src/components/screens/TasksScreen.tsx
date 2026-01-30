import React, { useState, useEffect, useMemo } from 'react';
import { SquareCheck as CheckSquare, Square, Clock, Loader as Loader2, User, ChevronDown, Hand, Zap, Users, Search, X, Info, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    'Prospect': { char: '', color: 'bg-slate-400', label: 'Prospect' },
    'Qualified': { char: 'Q', color: 'bg-blue-500', label: 'Qualified' },
    'Proposal': { char: 'P', color: 'bg-amber-500', label: 'Proposal' },
    'Negotiation': { char: 'N', color: 'bg-purple-500', label: 'Negotiation' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500', label: 'Term Sheet' },
    'Won': { char: 'W', color: 'bg-green-500', label: 'Won' }
  };
  return configs[stage] || { char: '', color: 'bg-slate-400', label: stage };
};

export const TasksScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { users } = useAppContext();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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
          group.deal.name.toLowerCase().includes(searchLower)
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

  // Auto-expand parent tasks when data loads
  useEffect(() => {
    if (dealGroups.length > 0) {
      // Expand all tasks that have children
      const tasksWithChildren: string[] = [];
      dealGroups.forEach(group => {
        const taskMap = new Map<string, TaskThread>();
        group.tasks.forEach(task => taskMap.set(task.id, task));

        group.tasks.forEach(task => {
          if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
            if (!tasksWithChildren.includes(task.parentTaskId)) {
              tasksWithChildren.push(task.parentTaskId);
            }
          }
        });
      });
      setExpandedTasks(new Set(tasksWithChildren));
    }
  }, [dealGroups]);

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

  interface FlatTask extends TaskThread {
    depth: number;
    isLast: boolean;
    hasChildren: boolean;
    parentDepth: number;
  }

  const flattenTaskTree = (tasks: TaskThread[]): FlatTask[] => {
    const result: FlatTask[] = [];

    const traverse = (nodes: (TaskThread & { children?: TaskThread[] })[], depth: number, parentDepth: number = -1) => {
      nodes.forEach((node, idx) => {
        const isLast = idx === nodes.length - 1;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedTasks.has(node.id);

        result.push({
          ...node,
          depth,
          isLast,
          hasChildren: !!hasChildren,
          parentDepth
        });

        if (hasChildren && isExpanded) {
          traverse(node.children!, depth + 1, depth);
        }
      });
    };

    traverse(tasks, 0);
    return result;
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

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderTask = (flatTask: FlatTask, dealId: string): React.ReactNode => {
    const { depth, isLast, hasChildren } = flatTask;
    const isCompleted = flatTask.status === 'Completed';
    const isMine = flatTask.assignedToId === user?.id;
    const isExpanded = expandedTasks.has(flatTask.id);
    const isUnassigned = !flatTask.assignedToId;

    const taskRowStyle = depth > 0 ? {
      '--line-left': `${(depth - 1) * 32 + 20}px`,
      '--line-height': isLast ? '18px' : '100%',
      '--elbow-width': `${depth * 32 - 4 - ((depth - 1) * 32 + 20)}px`,
    } as React.CSSProperties : {};

    return (
      <div
        key={flatTask.id}
        className={`task-row group ${depth > 0 ? 'task-row-nested' : ''} transition-colors hover:bg-slate-50/30`}
        style={taskRowStyle}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'start',
            gap: '0.75rem',
            paddingTop: '0.375rem',
            paddingBottom: '0.375rem',
            paddingLeft: `${depth * 32}px`,
            position: 'relative',
            backgroundColor: 'transparent',
            zIndex: 2
          }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(flatTask.id)}
              className="tree-toggle-btn flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-700"
              style={{
                position: 'absolute',
                left: `${(depth - 1) * 32 + 12}px`,
                top: '12px'
              }}
            >
              {isExpanded ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
            </button>
          )}

          {depth > 0 && hasChildren && (
            <div
              onClick={() => toggleExpanded(flatTask.id)}
              className="absolute cursor-pointer hover:opacity-75 transition-opacity"
              style={{
                left: `${(depth - 1) * 32 + 20}px`,
                top: 0,
                width: '2px',
                height: '100%',
                zIndex: 1
              }}
            />
          )}

          {isUnassigned ? (
            <button
              onClick={() => pickupTask(flatTask.id, flatTask.summary)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-full transition-colors border border-amber-300 ring-4 ring-white"
            >
              <Hand className="w-4 h-4 text-amber-700" />
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0">
                    <Avatar className="w-8 h-8 ring-4 ring-white">
                      <AvatarImage src={flatTask.assigneeAvatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                        {flatTask.assigneeName ? getInitials(flatTask.assigneeName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{flatTask.assigneeName || 'Unassigned'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1 min-w-0 pr-2 flex items-center gap-2">
            <p
              className={`text-[14px] leading-relaxed ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              } ${isMine && !isCompleted ? 'font-medium' : ''}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {flatTask.summary}
            </p>
            <button
              onClick={() => addSubtask(flatTask.id, dealId)}
              className="task-add-btn flex-shrink-0 w-4 h-4 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {flatTask.dueDate && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(flatTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}

            <button
              onClick={() => toggleTask(flatTask.id, flatTask.status)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isCompleted ? (
                <CheckSquare className="w-5 h-5 text-green-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-300 hover:text-slate-500 transition-colors" />
              )}
            </button>
          </div>
        </div>
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
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-3 mb-6 pt-6">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
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
            const flatTasks = flattenTaskTree(taskTree);

            return (
              <div key={group.deal.id} className="mb-8">
                <div className="flex items-center gap-3 px-2 py-3">
                  <div
                    className={`w-9 h-9 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {stageConfig.char}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[16px] text-slate-900 truncate">{group.deal.name}</h3>
                  </div>

                  <div className="text-[11px] font-medium text-slate-400 flex-shrink-0">
                    {group.deal.value ? `${group.deal.value} MW` : ''}
                  </div>

                  <div className="text-[11px] font-medium text-slate-400 flex-shrink-0 min-w-[40px] text-right">
                    {group.completed_tasks}/{group.total_tasks}
                  </div>
                </div>

                {flatTasks.length > 0 && (
                  <div className="space-y-0 pl-2">
                    {flatTasks.map(flatTask =>
                      renderTask(flatTask, group.deal.id)
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
