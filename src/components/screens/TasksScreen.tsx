import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Clock, Loader2, User, Target, ChevronDown, ChevronRight, Hand, Zap, Users, Search, X, Filter, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
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

export const TasksScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { users } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Hierarchy and team view
  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Fetch subordinates for hierarchy view
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

  // Reset member filter when switching back to "Mine"
  useEffect(() => {
    if (hierarchyView === 'mine') setSelectedMemberId('all');
  }, [hierarchyView]);

  // Calculate team members list for dropdown
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

  // Store separate counts for Mine and Team
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);

  // Function to fetch counts
  const fetchCounts = async () => {
    if (!user?.id) return;

    try {
      // Fetch my tasks count
      const { data: myData } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: 'mine'
      });
      const myCount = myData?.reduce((sum: number, group: DealGroup) => sum + group.total_tasks, 0) || 0;
      setMyTasksCount(myCount);

      // Fetch team tasks count
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

  // Fetch counts on mount and when user changes
  useEffect(() => {
    fetchCounts();
  }, [user?.id]);

  // Filter deal groups based on search
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

      // Apply team member filter if in team view
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

  const renderTask = (task: TaskThread & { children?: TaskThread[] }, depth: number = 0) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
    const isCompleted = task.status === 'Completed';
    const isUnassigned = !task.assignedToId;
    const indentClass = depth > 0 ? `ml-${depth * 6}` : '';

    return (
      <div key={task.id} className="space-y-2">
        <div
          className={`p-3 bg-white border rounded-lg shadow-sm flex gap-3 items-start ${isCompleted ? 'opacity-60' : ''} ${indentClass}`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <button onClick={() => toggleTask(task.id, task.status)} className="mt-0.5 flex-shrink-0">
            {isCompleted ?
              <CheckSquare className="w-5 h-5 text-green-500" /> :
              <Square className="w-5 h-5 text-gray-300" />
            }
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.summary}
            </h4>
            {task.details && (
              <p className="text-xs text-gray-500 mt-1">{task.details}</p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}

              {!isUnassigned ? (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <User className="w-3 h-3" />
                  {task.assigneeName || 'Unknown'}
                </div>
              ) : (
                <button
                  onClick={() => pickupTask(task.id, task.summary)}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors border border-amber-200"
                >
                  <Hand className="w-3 h-3" />
                  Pickup?
                  <Zap className="w-3 h-3 text-amber-500" />
                </button>
              )}

              {task.priority && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  task.priority === 'High' ? 'bg-red-100 text-red-700' :
                  task.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority}
                </span>
              )}

              {depth > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                  L{depth + 1}
                </span>
              )}
            </div>
          </div>
        </div>

        {task.children && task.children.length > 0 && (
          <div className="space-y-2">
            {task.children.map(child => renderTask(child, depth + 1))}
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
    <div className="space-y-6 pb-24">
      {/* Header Section */}
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
            </div>

            {/* Search & Filter - Moved to Header Row */}
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
              <button
                onClick={() => setShowFilter(true)}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors flex-shrink-0"
              >
                <Filter className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Hierarchy View Toggle - My Tasks vs Team Tasks */}
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

            {/* Team Member Drill-Down Filter */}
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
        <div className="text-center py-12 text-gray-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No tasks found</p>
          <p className="text-xs mt-1">{search ? 'Try a different search' : 'Create tasks from the Deals screen'}</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {filteredDealGroups.map((group, idx) => {
            const taskTree = buildTaskTree(group.tasks);

            return (
              <AccordionItem
                key={group.deal.id}
                value={group.deal.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3 text-left">
                      <Target className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.deal.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.deal.account_name} • {group.deal.stage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-600">
                          {group.completed_tasks}/{group.total_tasks} Complete
                        </div>
                        <div className="w-24 mt-1">
                          <Progress
                            value={group.progress}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {taskTree.map(task => renderTask(task))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
