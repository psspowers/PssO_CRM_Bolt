import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, X, Plus, Calendar, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const INDENT_PX = 28;

interface TaskThread {
  id: string;
  summary: string;
  details?: string;
  task_status?: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  due_date?: string;
  assigned_to_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  parent_task_id?: string;
  depth: number;
  created_at: string;
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
  const configs: Record<string, { char: string; color: string }> = {
    'Prospect': { char: '', color: 'border border-gray-300 bg-transparent' },
    'Qualified': { char: 'Q', color: 'bg-blue-500' },
    'Proposal': { char: 'P', color: 'bg-amber-500' },
    'Negotiation': { char: 'N', color: 'bg-orange-500' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500' },
    'Won': { char: 'W', color: 'bg-green-500' }
  };
  const s = configs[stage] || { char: 'P', color: 'bg-gray-400' };
  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold', s.color)}>
      {s.char}
    </div>
  );
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
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
  users,
  assigneeId,
  summary,
  dueDate,
  currentUser,
  onAssigneeChange,
  onSummaryChange,
  onDueDateChange,
  onSave,
  onCancel
}) => {
  const indent = depth * INDENT_PX;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="relative flex items-start py-1 pr-4 bg-transparent my-1"
      style={{ paddingLeft: `${indent + 48}px` }}
    >
      <div className="absolute w-[2px] bg-gray-300" style={{ left: `${indent + 27}px`, top: '-12px', bottom: '0' }} />

      <Avatar className="w-8 h-8 flex-shrink-0 ring-4 ring-white z-10">
        {currentUser?.avatar ? <AvatarImage src={currentUser.avatar} alt={currentUser.name} /> : null}
        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
          {currentUser ? getInitials(currentUser.name) : '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 ml-3">
        <input
          ref={inputRef}
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="Type task... (Enter to save)"
          className="w-full bg-transparent border-b border-orange-400 focus:border-orange-600 outline-none text-sm font-medium py-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && summary.trim()) {
              e.preventDefault();
              onSave();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer"
            />
          </div>

          <select
            value={assigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="bg-transparent border-none outline-none cursor-pointer"
          >
            <option value={currentUser?.id}>Me</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex gap-3">
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onSave}
              disabled={!summary.trim()}
              className={cn("text-green-600 hover:text-green-700 transition-colors", !summary.trim() && "opacity-40 cursor-not-allowed")}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
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
      <div className="relative flex items-start py-1.5 pr-4 hover:bg-gray-50/80 transition-colors group">
        {!isLast && (
          <div
            className="absolute w-[2px] bg-gray-300"
            style={{ left: `${spineLeft}px`, top: 0, bottom: 0 }}
          />
        )}

        <div
          className="absolute h-[2px] bg-gray-300"
          style={{ left: `${spineLeft}px`, top: '50%', width: '16px' }}
        />

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(task.id);
            }}
            className="absolute z-50 w-4 h-4 bg-transparent flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            style={{ left: `${spineLeft - 8}px`, top: '50%', transform: 'translateY(-50%)' }}
          >
            <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        )}

        <div className="flex items-start gap-3 relative z-10 flex-1" style={{ paddingLeft: `${indent + 48}px` }}>
          {isUnassigned ? (
            <button onClick={() => onPickup(task.id, task.summary)} className="flex-shrink-0 group/pickup">
              <div className={cn(
                "w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 group-hover/pickup:border-orange-500 group-hover/pickup:bg-orange-50 transition-all ring-4 ring-white",
                isCompleted && "opacity-50 grayscale"
              )}>
                <Hand className="w-4 h-4 text-gray-400 group-hover/pickup:text-orange-500 transition-colors" />
              </div>
            </button>
          ) : (
            <Avatar className={cn("w-8 h-8 flex-shrink-0 ring-4 ring-white", isCompleted && "opacity-50 grayscale")}>
              {task.assignee_avatar && <AvatarImage src={task.assignee_avatar} alt={task.assignee_name} />}
              <AvatarFallback className="text-xs bg-gray-200 font-medium">
                {task.assignee_name ? getInitials(task.assignee_name) : '?'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
            <div>
              <p className={cn(
                'text-sm leading-snug',
                isMine ? 'font-medium text-black' : 'text-gray-700',
                isCompleted && 'line-through opacity-50 grayscale'
              )}>
                {task.summary}
              </p>
              {task.details && <p className="text-xs text-gray-500 opacity-70 mt-0.5">{task.details}</p>}
            </div>

            <div className="flex flex-col items-end gap-1">
              {task.due_date && (
                <div className={cn(
                  'text-xs',
                  new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-500',
                  isCompleted && 'opacity-50 grayscale'
                )}>
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
              <button onClick={() => onToggleComplete(task.id, task.task_status)}>
                {isCompleted ? (
                  <CheckSquare className="w-4 h-4 text-green-500 opacity-50 grayscale" />
                ) : (
                  <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                )}
              </button>
            </div>
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
              currentUser={users.find((u) => u.id === currentUserId)}
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          {!isAddingHere && (
            <div className="relative h-6 flex items-center" style={{ paddingLeft: `${indent + INDENT_PX + 27}px` }}>
              <div className="absolute w-[2px] bg-gray-300" style={{ left: `${indent + INDENT_PX + 27}px`, top: '-8px', height: '16px' }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChildTo(task.id, dealId);
                }}
                className="absolute w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-all z-10 shadow-sm"
                style={{
                  left: `${indent + INDENT_PX + 17}px`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
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
  const stageAvatar = getStageAvatar(group.stage);
  const tasks = group.tasks || [];
  const taskTree = buildTaskTree(tasks);
  const isDealExpanded = expandedDeals.has(group.id);
  const isAddingRoot = addingRootToDealId === group.id;
  const completedCount = tasks.filter(t => t.task_status === 'Completed').length;
  const totalCount = tasks.length;

  return (
    <div className="relative border-b border-gray-100">
      <div className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => onToggleDealExpand(group.id)}>
        <ChevronRight className={cn('w-5 h-5 text-gray-500 transition-transform', isDealExpanded && 'rotate-90')} />
        {stageAvatar}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-black truncate">{group.name}</h3>
            {group.mw > 0 && <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{group.mw} MW</span>}
          </div>
        </div>
        <div className="text-xs text-gray-500">{completedCount}/{totalCount}</div>
      </div>

      {isDealExpanded && (
        <div className="relative px-4">
          <div className="absolute w-[2px] bg-gray-300" style={{ left: '27px', top: '0', bottom: '0' }} />

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
              currentUser={users.find((u) => u.id === currentUserId)}
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          {!isAddingRoot && (
            <div className="relative h-6 flex items-center">
              <div className="absolute w-[2px] bg-gray-300" style={{ left: '27px', top: '-8px', height: '16px' }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRootTask(group.id);
                }}
                className="absolute w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-all z-10 shadow-sm"
                style={{
                  left: '17px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
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
  const [viewMode, setViewMode] = useState<'mine' | 'team'>('mine');
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
    if (user?.id && !newTaskAssignee) {
      setNewTaskAssignee(user.id);
    }
  }, [user?.id, newTaskAssignee]);

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
        description: '+5 Watts earned',
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
    setNewTaskDueDate('');
    if (user?.id) {
      setNewTaskAssignee(user.id);
    }
    setExpandedDeals(prev => new Set(prev).add(dealId));
  };

  const handleAddChildTask = (parentId: string, dealId: string) => {
    setAddingToTaskId(parentId);
    setAddingRootToDealId(null);
    setAddingToDealId(dealId);
    setNewTaskSummary('');
    setNewTaskDueDate('');
    if (user?.id) {
      setNewTaskAssignee(user.id);
    }
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
      setNewTaskDueDate('');
      if (user?.id) {
        setNewTaskAssignee(user.id);
      }
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
    setNewTaskDueDate('');
    if (user?.id) {
      setNewTaskAssignee(user.id);
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
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-2xl mx-auto bg-white">
      <div className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-4 py-3">
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
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('mine')}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-all',
              viewMode === 'mine' ? 'bg-white text-black shadow-sm font-medium' : 'text-gray-600 hover:text-black'
            )}
          >
            Mine {myTasksCount > 0 && `(${myTasksCount})`}
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-all',
              viewMode === 'team' ? 'bg-white text-black shadow-sm font-medium' : 'text-gray-600 hover:text-black'
            )}
          >
            Team {teamTasksCount > 0 && `(${teamTasksCount})`}
          </button>
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
          filteredDealGroups.map((group) => (
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

export default TasksScreen;
