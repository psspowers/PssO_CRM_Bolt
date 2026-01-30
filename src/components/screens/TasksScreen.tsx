import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Clock, Loader2, User, ChevronDown, Hand, Users, Search, X, Info, Plus, Minus, Calendar, Check } from 'lucide-react';
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

const INDENT_PX = 32;

interface InlineTaskEditorProps {
  depth: number;
  users: any[];
  assigneeId: string;
  summary: string;
  dueDate: string;
  onAssigneeChange: (id: string) => void;
  onSummaryChange: (text: string) => void;
  onDueDateChange: (date: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const InlineTaskEditor: React.FC<InlineTaskEditorProps> = ({
  depth,
  users,
  assigneeId,
  summary,
  dueDate,
  onAssigneeChange,
  onSummaryChange,
  onDueDateChange,
  onSave,
  onCancel
}) => {
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const assignedUser = users.find(u => u.id === assigneeId);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="task-row relative py-2 pr-4 overflow-visible"
      style={{ '--spine-x': `${depth * INDENT_PX}px` } as React.CSSProperties}
    >
      {depth > 0 && (
        <>
          <div className="tree-spine z-0" style={{ bottom: '-14px' }} />
          <div className="tree-elbow z-0" />
        </>
      )}

      <div
        className="flex items-center gap-3 relative z-10"
        style={{ paddingLeft: `${depth * INDENT_PX + 24}px` }}
      >
        <div className="relative">
          <button
            onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
            className="flex-shrink-0"
          >
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarImage src={assignedUser?.avatar_url} />
              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                {assignedUser ? getInitials(assignedUser.name) : '?'}
              </AvatarFallback>
            </Avatar>
          </button>

          {showAssigneeMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] min-w-[180px] max-h-60 overflow-y-auto">
              {users
                .filter(u => ['internal', 'admin', 'super_admin'].includes(u.role))
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onAssigneeChange(u.id);
                      setShowAssigneeMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-slate-900">{u.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            autoFocus
            rows={2}
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey && summary.trim()) {
                e.preventDefault();
                onSave();
              }
              if (e.key === 'Escape') {
                onCancel();
              }
            }}
            placeholder="Type task description..."
            className="w-full text-sm leading-relaxed bg-transparent border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-1 py-1 text-slate-900 placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="flex flex-col items-center gap-1 flex-shrink-0 ml-2">
          <input
            ref={dateInputRef}
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className="absolute opacity-0 pointer-events-auto w-0 h-0"
          />

          <button
            onClick={() => dateInputRef.current?.click()}
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title={dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set due date'}
          >
            <Calendar className="w-4 h-4 text-slate-600" />
          </button>

          <button
            onClick={onSave}
            disabled={!summary.trim()}
            className="p-1.5 hover:bg-green-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Save (Cmd+Enter)"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>

          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-red-50 rounded transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
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
  onAddSubtask: (parentId: string, dealId: string) => void;
  currentUserId?: string;
  addingToTaskId: string | null;
  newTaskSummary: string;
  newTaskAssignee: string;
  newTaskDueDate: string;
  users: any[];
  onNewTaskSummaryChange: (text: string) => void;
  onNewTaskAssigneeChange: (id: string) => void;
  onNewTaskDueDateChange: (date: string) => void;
  onSaveNewTask: () => void;
  onCancelNewTask: () => void;
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
  onAddSubtask,
  currentUserId,
  addingToTaskId,
  newTaskSummary,
  newTaskAssignee,
  newTaskDueDate,
  users,
  onNewTaskSummaryChange,
  onNewTaskAssigneeChange,
  onNewTaskDueDateChange,
  onSaveNewTask,
  onCancelNewTask
}) => {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expanded.has(task.id);
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === currentUserId;
  const isUnassigned = !task.assignedToId;
  const isAddingHere = addingToTaskId === task.id;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div
        className="task-row relative py-3 pr-4 overflow-visible border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 transition-colors group"
        style={{ '--spine-x': `${depth * INDENT_PX}px` } as React.CSSProperties}
      >
        {depth > 0 && (
          <>
            <div
              className="tree-spine"
              style={{
                bottom: isLast && !isAddingHere ? '50%' : '-14px'
              }}
            />
            <div className="tree-elbow" />
          </>
        )}

        {hasChildren && (
          <div
            className="junction-dot"
            onClick={() => onToggleExpand(task.id)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minus className="w-2 h-2 text-white" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            ) : (
              <Plus className="w-2 h-2 text-white" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            )}
          </div>
        )}

        <div
          className="red-plus-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubtask(task.id, dealId);
          }}
          title="Add subtask"
        >
          +
        </div>

        <div
          className="flex items-start gap-3 relative z-10"
          style={{ paddingLeft: `${depth * INDENT_PX + 24}px` }}
        >
          {isUnassigned ? (
            <button
              onClick={() => onPickup(task.id, task.summary)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-full transition-colors border border-amber-300 ring-4 ring-white dark:ring-slate-900"
            >
              <Hand className="w-4 h-4 text-amber-700" />
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0 bg-white dark:bg-slate-900">
                    <Avatar className="w-8 h-8 ring-4 ring-white dark:ring-slate-900">
                      <AvatarImage src={task.assigneeAvatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                        {task.assigneeName ? getInitials(task.assigneeName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{task.assigneeName || 'Unassigned'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1 min-w-0 pr-2">
            <p
              className={`text-[14px] leading-relaxed ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
              } ${isMine && !isCompleted ? 'font-medium bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded' : ''}`}
            >
              {task.summary}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {task.dueDate && (
              <div className="text-[11px] text-slate-400 font-medium">
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}

            <button
              onClick={() => onToggleComplete(task.id, task.status)}
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

      {isAddingHere && (
        <InlineTaskEditor
          depth={depth + 1}
          users={users}
          assigneeId={newTaskAssignee}
          summary={newTaskSummary}
          dueDate={newTaskDueDate}
          onAssigneeChange={onNewTaskAssigneeChange}
          onSummaryChange={onNewTaskSummaryChange}
          onDueDateChange={onNewTaskDueDateChange}
          onSave={onSaveNewTask}
          onCancel={onCancelNewTask}
        />
      )}

      {hasChildren && isExpanded && task.children && (
        <>
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
              onAddSubtask={onAddSubtask}
              currentUserId={currentUserId}
              addingToTaskId={addingToTaskId}
              newTaskSummary={newTaskSummary}
              newTaskAssignee={newTaskAssignee}
              newTaskDueDate={newTaskDueDate}
              users={users}
              onNewTaskSummaryChange={onNewTaskSummaryChange}
              onNewTaskAssigneeChange={onNewTaskAssigneeChange}
              onNewTaskDueDateChange={onNewTaskDueDateChange}
              onSaveNewTask={onSaveNewTask}
              onCancelNewTask={onCancelNewTask}
            />
          ))}
        </>
      )}
    </>
  );
};

interface DealThreadItemProps {
  group: DealGroup;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleComplete: (id: string, status?: string) => void;
  onPickup: (id: string, summary: string) => void;
  onAddSubtask: (parentId: string, dealId: string) => void;
  currentUserId?: string;
  addingToTaskId: string | null;
  newTaskSummary: string;
  newTaskAssignee: string;
  newTaskDueDate: string;
  users: any[];
  onNewTaskSummaryChange: (text: string) => void;
  onNewTaskAssigneeChange: (id: string) => void;
  onNewTaskDueDateChange: (date: string) => void;
  onSaveNewTask: () => void;
  onCancelNewTask: () => void;
}

const DealThreadItem: React.FC<DealThreadItemProps> = ({
  group,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onPickup,
  onAddSubtask,
  currentUserId,
  addingToTaskId,
  newTaskSummary,
  newTaskAssignee,
  newTaskDueDate,
  users,
  onNewTaskSummaryChange,
  onNewTaskAssigneeChange,
  onNewTaskDueDateChange,
  onSaveNewTask,
  onCancelNewTask
}) => {
  const stageConfig = getStageConfig(group.deal.stage);
  const taskTree = buildTaskTree(group.tasks);

  return (
    <div className="mb-8">
      <div className="relative flex items-center gap-3 px-2 py-3">
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

      {taskTree.length > 0 && (
        <div className="pl-2">
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
              onAddSubtask={onAddSubtask}
              currentUserId={currentUserId}
              addingToTaskId={addingToTaskId}
              newTaskSummary={newTaskSummary}
              newTaskAssignee={newTaskAssignee}
              newTaskDueDate={newTaskDueDate}
              users={users}
              onNewTaskSummaryChange={onNewTaskSummaryChange}
              onNewTaskAssigneeChange={onNewTaskAssigneeChange}
              onNewTaskDueDateChange={onNewTaskDueDateChange}
              onSaveNewTask={onSaveNewTask}
              onCancelNewTask={onCancelNewTask}
            />
          ))}
        </div>
      )}
    </div>
  );
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

export const TasksScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { users } = useAppContext();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingToTaskId, setAddingToTaskId] = useState<string | null>(null);
  const [addingToDealId, setAddingToDealId] = useState<string | null>(null);
  const [newTaskSummary, setNewTaskSummary] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');

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
      console.log('[TasksScreen] Fetching tasks with:', { userId: user?.id, filter: filterParam });

      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user?.id || null,
        p_filter: filterParam
      });

      console.log('[TasksScreen] RPC Response:', { data, error });

      if (error) {
        console.error('[TasksScreen] RPC Error:', error);
        throw error;
      }

      // The RPC returns JSON, which Supabase automatically parses
      let filteredData: DealGroup[] = [];

      if (data !== null && data !== undefined) {
        console.log('[TasksScreen] Data type:', typeof data, 'isArray:', Array.isArray(data));
        console.log('[TasksScreen] Raw data:', JSON.stringify(data).substring(0, 500));

        if (Array.isArray(data)) {
          // Data is already an array
          filteredData = data as DealGroup[];
        } else if (typeof data === 'object') {
          // Sometimes RPC returns wrapped data - try common patterns
          if ('data' in data) {
            filteredData = (data as any).data as DealGroup[];
          } else {
            // Treat as single object or already parsed JSON
            filteredData = [data] as DealGroup[];
          }
        }
      }

      console.log('[TasksScreen] Deal groups returned:', filteredData.length, 'groups');

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

      console.log('[TasksScreen] Final deal groups to display:', filteredData.length, 'groups');
      setDealGroups(filteredData);
    } catch (error: any) {
      console.error('[TasksScreen] Error fetching task threads:', error);
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

  useEffect(() => {
    if (dealGroups.length > 0) {
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

  const handleAddSubtask = (parentId: string, dealId: string) => {
    setAddingToTaskId(parentId);
    setAddingToDealId(dealId);
    setNewTaskSummary('');
    setNewTaskAssignee(user?.id || '');
    setNewTaskDueDate('');
    setExpandedTasks(prev => new Set(prev).add(parentId));
  };

  const handleSaveSubtask = async () => {
    console.log('[TasksScreen] handleSaveSubtask called', {
      summary: newTaskSummary,
      dealId: addingToDealId,
      taskId: addingToTaskId,
      assignee: newTaskAssignee,
      dueDate: newTaskDueDate
    });

    if (!newTaskSummary.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a task description',
        variant: 'destructive'
      });
      return;
    }

    if (!addingToDealId) {
      console.error('[TasksScreen] Missing addingToDealId');
      toast({
        title: 'Error',
        description: 'Missing deal information',
        variant: 'destructive'
      });
      return;
    }

    if (!addingToTaskId) {
      console.error('[TasksScreen] Missing addingToTaskId');
      toast({
        title: 'Error',
        description: 'Missing parent task information',
        variant: 'destructive'
      });
      return;
    }

    try {
      const insertData: any = {
        type: 'Task',
        summary: newTaskSummary.trim(),
        task_status: 'Pending',
        related_to_id: addingToDealId,
        related_to_type: 'Opportunity',
        is_task: true,
        assigned_to_id: newTaskAssignee || user?.id,
        parent_task_id: addingToTaskId,
        created_by: user?.id
      };

      if (newTaskDueDate) {
        insertData.due_date = new Date(newTaskDueDate).toISOString();
      }

      console.log('[TasksScreen] Inserting task:', insertData);

      const { error, data } = await supabase.from('activities').insert(insertData).select();

      if (error) {
        console.error('[TasksScreen] Insert error:', error);
        throw error;
      }

      console.log('[TasksScreen] Task inserted successfully:', data);

      toast({
        title: 'Subtask Added',
        description: 'New subtask created successfully',
        className: 'bg-green-50 border-green-200'
      });

      setAddingToTaskId(null);
      setAddingToDealId(null);
      setNewTaskSummary('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      fetchTaskThreads();
      fetchCounts();
    } catch (error: any) {
      console.error('[TasksScreen] Error adding subtask:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add subtask',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSubtask = () => {
    setAddingToTaskId(null);
    setAddingToDealId(null);
    setNewTaskSummary('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
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
          {filteredDealGroups.map(group => (
            <DealThreadItem
              key={group.deal.id}
              group={group}
              expanded={expandedTasks}
              onToggleExpand={toggleExpanded}
              onToggleComplete={toggleTask}
              onPickup={pickupTask}
              onAddSubtask={handleAddSubtask}
              currentUserId={user?.id}
              addingToTaskId={addingToTaskId}
              newTaskSummary={newTaskSummary}
              newTaskAssignee={newTaskAssignee}
              newTaskDueDate={newTaskDueDate}
              users={users}
              onNewTaskSummaryChange={setNewTaskSummary}
              onNewTaskAssigneeChange={setNewTaskAssignee}
              onNewTaskDueDateChange={setNewTaskDueDate}
              onSaveNewTask={handleSaveSubtask}
              onCancelNewTask={handleCancelSubtask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
