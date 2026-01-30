import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Search, X, Plus, ChevronDown, ChevronRight, Hand } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const INDENT_PX = 32;

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
    mw: number;
    account_name: string;
  };
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: TaskThread[];
}

const getStageAvatar = (stage: string) => {
  const configs: Record<string, { char: string; color: string; label: string }> = {
    'Prospect': { char: 'P', color: 'bg-gray-400', label: 'Prospect' },
    'Qualified': { char: 'Q', color: 'bg-blue-500', label: 'Qualified' },
    'Proposal': { char: 'P', color: 'bg-amber-500', label: 'Proposal' },
    'Negotiation': { char: 'N', color: 'bg-purple-500', label: 'Negotiation' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500', label: 'Term Sheet' },
    'Won': { char: 'W', color: 'bg-green-500', label: 'Won' }
  };
  return configs[stage] || { char: 'P', color: 'bg-gray-400', label: stage };
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const buildTaskTree = (tasks: TaskThread[]): (TaskThread & { children: TaskThread[] })[] => {
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

interface TaskRowProps {
  task: TaskThread & { children?: TaskThread[] };
  dealId: string;
  depth: number;
  isLast: boolean;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleComplete: (id: string, status?: string) => void;
  onPickup: (id: string, summary: string) => void;
  currentUserId?: string;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  dealId,
  depth,
  isLast,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onPickup,
  currentUserId
}) => {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expanded.has(task.id);
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === currentUserId;
  const isUnassigned = !task.assignedToId;

  const indent = depth * INDENT_PX;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <div
          className={cn(
            "relative flex gap-3 py-3 px-4 hover:bg-gray-100/50 rounded-lg transition-colors cursor-pointer",
            isCompleted && "opacity-60"
          )}
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          {depth > 0 && (
            <>
              <div
                className="absolute w-[2px] bg-gray-200"
                style={{
                  left: `${indent - 8}px`,
                  top: '-12px',
                  bottom: isLast ? '50%' : '-12px'
                }}
              />
              <div
                className="absolute h-[2px] bg-gray-200"
                style={{
                  left: `${indent - 8}px`,
                  top: '24px',
                  width: '20px'
                }}
              />
            </>
          )}

          {isUnassigned ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPickup(task.id, task.summary);
              }}
              className="flex-shrink-0 group/pickup"
              title="Pick up this task"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 group-hover/pickup:border-orange-500 group-hover/pickup:bg-orange-50 transition-all">
                <Hand className="w-4 h-4 text-gray-400 group-hover/pickup:text-orange-500 transition-colors" />
              </div>
            </button>
          ) : (
            <Avatar className="w-8 h-8 flex-shrink-0">
              {task.assigneeAvatar && (
                <AvatarImage src={task.assigneeAvatar} alt={task.assigneeName} />
              )}
              <AvatarFallback className="text-xs bg-gray-200 font-medium text-gray-700">
                {task.assigneeName ? getInitials(task.assigneeName) : '?'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm leading-relaxed",
                  isMine ? "font-semibold text-gray-900" : "font-normal text-gray-600",
                  isCompleted && "line-through"
                )}>
                  {task.summary}
                </p>
                {task.dueDate && (
                  <div className="text-xs text-gray-400 mt-1">
                    Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                {isCompleted && (
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    Completed
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(task.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(task.id, task.status);
                  }}
                  className="flex-shrink-0"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && task.children && (
          <div className="relative">
            {task.children.map((child, idx) => (
              <TaskRow
                key={child.id}
                task={child}
                dealId={dealId}
                depth={depth + 1}
                isLast={idx === task.children!.length - 1}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                onToggleComplete={onToggleComplete}
                onPickup={onPickup}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface DealThreadProps {
  group: DealGroup;
  expanded: Set<string>;
  expandedDeals: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleDealExpand: (id: string) => void;
  onToggleComplete: (id: string, status?: string) => void;
  onPickup: (id: string, summary: string) => void;
  currentUserId?: string;
}

const DealThreadItem: React.FC<DealThreadProps> = ({
  group,
  expanded,
  expandedDeals,
  onToggleExpand,
  onToggleDealExpand,
  onToggleComplete,
  onPickup,
  currentUserId
}) => {
  const stageConfig = getStageAvatar(group.deal.stage);
  const taskTree = buildTaskTree(group.tasks);
  const isDealExpanded = expandedDeals.has(group.deal.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-transparent border-b border-gray-100 py-4 px-4"
    >
      <div
        className="relative flex items-center gap-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors"
        onClick={() => onToggleDealExpand(group.deal.id)}
      >
        <button
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDealExpand(group.deal.id);
          }}
        >
          <ChevronDown className={cn("w-5 h-5 transition-transform", !isDealExpanded && "-rotate-90")} />
        </button>

        <div
          className={`w-10 h-10 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {stageConfig.char}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{group.deal.name}</h3>
            {group.deal.mw && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                {group.deal.mw} MW
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400 flex-shrink-0">
          {group.completed_tasks}/{group.total_tasks}
        </div>
      </div>

      <AnimatePresence>
        {isDealExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden"
          >
            <div className="relative mt-2 ml-4 border-l-2 border-gray-200 pl-2">
              {taskTree.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  dealId={group.deal.id}
                  depth={0}
                  isLast={idx === taskTree.length - 1}
                  expanded={expanded}
                  onToggleExpand={onToggleExpand}
                  onToggleComplete={onToggleComplete}
                  onPickup={onPickup}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [myTasksCount, setMyTasksCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSubordinates = async () => {
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
      }
    };

    fetchSubordinates();
  }, [user?.id]);

  const filteredDealGroups = useMemo(() => {
    if (!search.trim()) return dealGroups;

    const searchLower = search.toLowerCase();
    return dealGroups.map(group => {
      const filteredTasks = group.tasks.filter(task =>
        task.summary.toLowerCase().includes(searchLower) ||
        task.assigneeName?.toLowerCase().includes(searchLower)
      );

      return {
        ...group,
        tasks: filteredTasks,
        total_tasks: filteredTasks.length,
        completed_tasks: filteredTasks.filter(t => t.status === 'Completed').length,
        progress: filteredTasks.length > 0
          ? (filteredTasks.filter(t => t.status === 'Completed').length / filteredTasks.length) * 100
          : 0
      };
    }).filter(group => group.tasks.length > 0 || group.deal.name.toLowerCase().includes(searchLower));
  }, [dealGroups, search]);

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

  const fetchTaskThreads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const filterMode = hierarchyView === 'mine' ? 'mine' : 'all';

      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: filterMode
      });

      if (error) throw error;

      setDealGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching task threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskThreads();
  }, [user?.id, hierarchyView]);

  useEffect(() => {
    if (dealGroups.length > 0) {
      const dealIds = dealGroups.map(g => g.deal.id);
      const tasksWithChildren = dealGroups.flatMap(g =>
        g.tasks.filter(t => g.tasks.some(child => child.parentTaskId === t.id)).map(t => t.id)
      );
      setExpandedTasks(new Set(tasksWithChildren));
      setExpandedDeals(new Set(dealIds));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-24">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-xl font-medium text-gray-900 mb-3">Tasks</h1>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-10 py-2 bg-gray-100 border-0 rounded-full text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHierarchyView('mine')}
              className={cn(
                "px-4 py-1.5 text-sm rounded-full transition-all font-medium",
                hierarchyView === 'mine'
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Mine {myTasksCount > 0 && `(${myTasksCount})`}
            </button>
            <button
              onClick={() => setHierarchyView('team')}
              className={cn(
                "px-4 py-1.5 text-sm rounded-full transition-all font-medium",
                hierarchyView === 'team'
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Team {teamTasksCount > 0 && `(${teamTasksCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {filteredDealGroups.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <Circle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No tasks found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try a different search' : 'Create tasks from the Deals screen'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredDealGroups.map(group => (
              <DealThreadItem
                key={group.deal.id}
                group={group}
                expanded={expandedTasks}
                expandedDeals={expandedDeals}
                onToggleExpand={toggleExpanded}
                onToggleDealExpand={toggleDealExpanded}
                onToggleComplete={toggleTask}
                onPickup={pickupTask}
                currentUserId={user?.id}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
