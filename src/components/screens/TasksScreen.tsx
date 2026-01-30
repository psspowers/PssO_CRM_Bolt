import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Loader2, Hand, X, Plus, ChevronRight, Check } from 'lucide-react';
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
  task_status?: string;
  due_date?: string;
  assigned_to_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  parent_task_id?: string;
  thread_depth?: number;
  from_pulse?: boolean;
  children?: TaskThread[];
}

interface DealGroup {
  id: string;
  name: string;
  stage: string;
  mw: number;
  velocity_score: number;
  tasks: TaskThread[] | null;
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

const buildTaskTree = (tasks: TaskThread[]): TaskThread[] => {
  const taskMap = new Map<string, TaskThread>();
  const roots: TaskThread[] = [];

  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  tasks.forEach(task => {
    const node = taskMap.get(task.id)!;
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      const parent = taskMap.get(task.parent_task_id)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

interface InlineTaskEditorProps {
  depth: number;
  users: any[];
  assigneeId: string;
  summary: string;
  dueDate: string;
  currentUser?: { id: string; name: string; avatar?: string };
  onAssigneeChange: (id: string) => void;
  onSummaryChange: (text: string) => void;
  onDueDateChange: (date: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const InlineTaskEditor: React.FC<InlineTaskEditorProps> = ({
  depth,
  assigneeId,
  summary,
  dueDate,
  currentUser,
  onSummaryChange,
  onDueDateChange,
  onSave,
  onCancel
}) => {
  const indent = depth * INDENT_PX;
  const spineLeft = indent + 27;

  return (
    <div className="relative flex items-start py-1.5 pr-4">
      <div
        className="absolute w-[2px] bg-slate-200"
        style={{
          left: `${spineLeft}px`,
          top: '-14px',
          bottom: '0'
        }}
      />

      <div
        className="absolute h-[2px] bg-orange-500"
        style={{
          left: `${spineLeft}px`,
          top: '20px',
          width: '16px'
        }}
      />

      <div
        className="flex items-start gap-3 relative z-10 flex-1"
        style={{ paddingLeft: `${indent + 48}px` }}
      >
        <Avatar className="w-8 h-8 flex-shrink-0 ring-4 ring-white z-10">
          {currentUser?.avatar ? (
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
          ) : null}
          <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
            {currentUser ? getInitials(currentUser.name) : '?'}
          </AvatarFallback>
        </Avatar>

        <input
          autoFocus
          type="text"
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && summary.trim()) {
              e.preventDefault();
              onSave();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="What needs to be done?"
          className="flex-1 bg-transparent border-b border-orange-500 focus:outline-none text-sm resize-none py-1 placeholder-gray-400"
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className="text-xs text-gray-500 border-0 focus:outline-none bg-transparent"
          />

          <button
            onClick={onSave}
            disabled={!summary.trim()}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
            title="Save (Enter)"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>

          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface TaskRowProps {
  task: TaskThread;
  dealId: string;
  depth: number;
  isLast: boolean;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleComplete: (id: string, status?: string) => void;
  onPickup: (id: string, summary: string) => void;
  onAddChildTo: (parentId: string, dealId: string) => void;
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
  onAddChildTo,
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
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const isAddingHere = addingToTaskId === task.id;

  const indent = depth * INDENT_PX;
  const spineLeft = indent + 27;

  return (
    <>
      <div className="relative flex items-start py-1.5 pr-4">
        {!isLast && !isAddingHere && (
          <div
            className="absolute w-[2px] bg-slate-200"
            style={{
              left: `${spineLeft}px`,
              top: '-14px',
              bottom: '-14px'
            }}
          />
        )}

        {isLast && !isAddingHere && (
          <div
            className="absolute w-[2px] bg-slate-200"
            style={{
              left: `${spineLeft}px`,
              top: '-14px',
              height: 'calc(50% + 6px)'
            }}
          />
        )}

        {isAddingHere && (
          <div
            className="absolute w-[2px] bg-slate-200"
            style={{
              left: `${spineLeft}px`,
              top: '-14px',
              bottom: '-14px'
            }}
          />
        )}

        <div
          className="absolute h-[2px] bg-slate-200"
          style={{
            left: `${spineLeft}px`,
            top: '20px',
            width: '16px'
          }}
        />

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleExpand(task.id);
            }}
            className="absolute z-50 w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all"
            style={{
              left: `${spineLeft - 8}px`,
              top: '12px'
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={cn("w-2.5 h-2.5 text-gray-500 transition-transform", isExpanded && "rotate-90")} />
          </button>
        )}

        <div
          className="flex items-start gap-3 relative z-10 flex-1"
          style={{ paddingLeft: `${indent + 48}px` }}
        >
          {isUnassigned ? (
            <button
              onClick={() => onPickup(task.id, task.summary)}
              className="flex-shrink-0 group/pickup"
              title="Pick up this task"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 group-hover/pickup:border-orange-500 group-hover/pickup:bg-orange-50 transition-all ring-4 ring-white z-10">
                <Hand className="w-4 h-4 text-gray-400 group-hover/pickup:text-orange-500 transition-colors" />
              </div>
            </button>
          ) : (
            <Avatar className="w-8 h-8 flex-shrink-0 ring-4 ring-white z-10">
              {task.assignee_avatar && (
                <AvatarImage src={task.assignee_avatar} alt={task.assignee_name} />
              )}
              <AvatarFallback className="text-xs bg-gray-200 font-medium">
                {task.assignee_name ? getInitials(task.assignee_name) : '?'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm leading-snug",
                isMine ? "font-bold text-black" : "font-normal text-gray-600",
                isCompleted && "line-through opacity-60"
              )}>
                {task.summary}
              </p>
              {task.due_date && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>

            <button
              onClick={() => onToggleComplete(task.id, task.task_status)}
              className="flex-shrink-0 mt-0.5"
            >
              {isCompleted ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Square className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" />
              )}
            </button>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && task.children && (
        <>
          {task.children.map((child, idx) => (
            <TaskRow
              key={child.id}
              task={child}
              dealId={dealId}
              depth={depth + 1}
              isLast={idx === task.children!.length - 1 && !isAddingHere}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleComplete={onToggleComplete}
              onPickup={onPickup}
              onAddChildTo={onAddChildTo}
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

          {isAddingHere && (
            <InlineTaskEditor
              depth={depth + 1}
              users={users}
              assigneeId={newTaskAssignee}
              summary={newTaskSummary}
              dueDate={newTaskDueDate}
              currentUser={users.find(u => u.id === currentUserId)}
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          {!isAddingHere && (
            <div className="relative h-6 w-full flex items-center">
              <div
                className="absolute w-[2px] bg-slate-200"
                style={{
                  left: `${indent + INDENT_PX + 27}px`,
                  top: '-8px',
                  height: '16px'
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddChildTo(task.id, dealId);
                }}
                className="absolute w-5 h-5 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-red-500 font-bold text-sm hover:bg-red-50 hover:scale-110 transition-all z-20 shadow-sm"
                style={{
                  left: `${indent + INDENT_PX + 17}px`,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
                title="Add subtask"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </>
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
  onAddRootTask: (dealId: string) => void;
  onAddChildTo: (parentId: string, dealId: string) => void;
  currentUserId?: string;
  addingToTaskId: string | null;
  addingRootToDealId: string | null;
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

const DealThreadItem: React.FC<DealThreadProps> = ({
  group,
  expanded,
  expandedDeals,
  onToggleExpand,
  onToggleDealExpand,
  onToggleComplete,
  onPickup,
  onAddRootTask,
  onAddChildTo,
  currentUserId,
  addingToTaskId,
  addingRootToDealId,
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
  const stageConfig = getStageAvatar(group.stage);
  const tasks = group.tasks || [];
  const taskTree = buildTaskTree(tasks);
  const isDealExpanded = expandedDeals.has(group.id);
  const isAddingRoot = addingRootToDealId === group.id;

  const completedCount = tasks.filter(t => t.task_status === 'Completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="relative py-3 border-b border-slate-100">
      <div className="relative flex items-center gap-3 px-4">
        <button
          onClick={() => onToggleDealExpand(group.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronRight className={cn("w-5 h-5 transition-transform", isDealExpanded && "rotate-90")} />
        </button>

        <div
          className={`w-8 h-8 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {stageConfig.char}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-black truncate">{group.name}</h3>
            {group.mw > 0 && (
              <span className="text-sm font-bold text-orange-600">
                {group.mw} MW
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500 flex-shrink-0">
          {completedCount}/{totalCount}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-12 right-0 h-[2px] bg-slate-100"
      >
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isDealExpanded && (
        <div className="relative">
          <div
            className="absolute w-[2px] bg-slate-200"
            style={{
              left: '27px',
              top: '0',
              bottom: isAddingRoot ? '0' : '-14px'
            }}
          />

          {taskTree.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              dealId={group.id}
              depth={0}
              isLast={idx === taskTree.length - 1 && !isAddingRoot}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleComplete={onToggleComplete}
              onPickup={onPickup}
              onAddChildTo={onAddChildTo}
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

          {isAddingRoot && (
            <InlineTaskEditor
              depth={0}
              users={users}
              assigneeId={newTaskAssignee}
              summary={newTaskSummary}
              dueDate={newTaskDueDate}
              currentUser={users.find(u => u.id === currentUserId)}
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          {!isAddingRoot && (
            <div className="relative h-6 w-full flex items-center">
              <div
                className="absolute w-[2px] bg-slate-200"
                style={{
                  left: '27px',
                  top: '-8px',
                  height: '16px'
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddRootTask(group.id);
                }}
                className="absolute w-5 h-5 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-red-500 font-bold text-sm hover:bg-red-50 hover:scale-110 transition-all z-20 shadow-sm"
                style={{
                  left: '17px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
                title="Add task"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
  const [addingToTaskId, setAddingToTaskId] = useState<string | null>(null);
  const [addingRootToDealId, setAddingRootToDealId] = useState<string | null>(null);
  const [addingToDealId, setAddingToDealId] = useState<string | null>(null);
  const [newTaskSummary, setNewTaskSummary] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');

  const [viewMode, setViewMode] = useState<'mine' | 'all' | 'delegated'>('mine');

  const [myTasksCount, setMyTasksCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);

  const filteredDealGroups = useMemo(() => {
    if (!search.trim()) return dealGroups;

    const searchLower = search.toLowerCase();
    return dealGroups.map(group => {
      const tasks = group.tasks || [];
      const filteredTasks = tasks.filter(task =>
        task.summary.toLowerCase().includes(searchLower) ||
        task.assignee_name?.toLowerCase().includes(searchLower)
      );

      return {
        ...group,
        tasks: filteredTasks
      };
    }).filter(group =>
      (group.tasks && group.tasks.length > 0) ||
      group.name.toLowerCase().includes(searchLower)
    );
  }, [dealGroups, search]);

  const fetchTaskThreads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_deal_threads_view', {
        p_view_mode: viewMode
      });

      if (error) throw error;

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      setDealGroups(parsedData || []);

      const allTasks = (parsedData || []).flatMap((g: DealGroup) => g.tasks || []);
      const myCount = allTasks.filter((t: TaskThread) => t.assigned_to_id === user.id).length;
      const teamCount = allTasks.length;

      setMyTasksCount(myCount);
      setTeamTasksCount(teamCount);
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
  }, [user?.id, viewMode]);

  useEffect(() => {
    if (dealGroups.length > 0) {
      const dealIds = dealGroups.map(g => g.id);
      const tasksWithChildren = dealGroups.flatMap(g =>
        (g.tasks || []).filter(t => (g.tasks || []).some(child => child.parent_task_id === t.id)).map(t => t.id)
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

  const handleAddRootTask = (dealId: string) => {
    setAddingRootToDealId(dealId);
    setAddingToDealId(dealId);
    setAddingToTaskId(null);
    setNewTaskSummary('');
    setNewTaskAssignee(user?.id || '');
    setNewTaskDueDate('');
    setExpandedDeals(prev => new Set(prev).add(dealId));
  };

  const handleAddChildTask = (parentId: string, dealId: string) => {
    setAddingToTaskId(parentId);
    setAddingRootToDealId(null);
    setAddingToDealId(dealId);
    setNewTaskSummary('');
    setNewTaskAssignee(user?.id || '');
    setNewTaskDueDate('');
    setExpandedTasks(prev => new Set(prev).add(parentId));
  };

  const handleSaveTask = async () => {
    if (!newTaskSummary.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a task description',
        variant: 'destructive'
      });
      return;
    }

    if (!addingToDealId) {
      toast({
        title: 'Error',
        description: 'Missing deal information',
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

      const { error } = await supabase.from('activities').insert(insertData);

      if (error) throw error;

      toast({
        title: addingToTaskId ? 'Subtask Added' : 'Task Added',
        description: 'New task created successfully',
        className: 'bg-green-50 border-green-200'
      });

      setAddingToTaskId(null);
      setAddingRootToDealId(null);
      setAddingToDealId(null);
      setNewTaskSummary('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      fetchTaskThreads();
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add task',
        variant: 'destructive'
      });
    }
  };

  const handleCancelTask = () => {
    setAddingToTaskId(null);
    setAddingRootToDealId(null);
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
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-2xl mx-auto bg-white">
      <div className="sticky top-0 z-[100] bg-white border-b border-slate-100 px-4">
        <div className="py-3">
          <h1 className="text-lg font-medium text-black mb-3">Tasks</h1>

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('mine')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-all",
                viewMode === 'mine'
                  ? "bg-black text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 font-normal"
              )}
            >
              Mine {myTasksCount > 0 && `(${myTasksCount})`}
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-all",
                viewMode === 'all'
                  ? "bg-black text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 font-normal"
              )}
            >
              Team {teamTasksCount > 0 && `(${teamTasksCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="p-0 space-y-0">
        {filteredDealGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No tasks found</p>
            <p className="text-xs mt-1">{search ? 'Try a different search' : 'Create tasks from the Deals screen'}</p>
          </div>
        ) : (
          filteredDealGroups.map(group => (
            <DealThreadItem
              key={group.id}
              group={group}
              expanded={expandedTasks}
              expandedDeals={expandedDeals}
              onToggleExpand={toggleExpanded}
              onToggleDealExpand={toggleDealExpanded}
              onToggleComplete={toggleTask}
              onPickup={pickupTask}
              onAddRootTask={handleAddRootTask}
              onAddChildTo={handleAddChildTask}
              currentUserId={user?.id}
              addingToTaskId={addingToTaskId}
              addingRootToDealId={addingRootToDealId}
              newTaskSummary={newTaskSummary}
              newTaskAssignee={newTaskAssignee}
              newTaskDueDate={newTaskDueDate}
              users={users}
              onNewTaskSummaryChange={setNewTaskSummary}
              onNewTaskAssigneeChange={setNewTaskAssignee}
              onNewTaskDueDateChange={setNewTaskDueDate}
              onSaveNewTask={handleSaveTask}
              onCancelNewTask={handleCancelTask}
            />
          ))
        )}
      </div>
    </div>
  );
};
