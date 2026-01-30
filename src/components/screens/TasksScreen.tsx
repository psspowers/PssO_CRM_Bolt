import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Clock, Loader2, User, Hand, Users, Search, X, Info, Plus, Minus, Calendar, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const INDENT_PX = 32;
const ROOT_SPINE_LEFT = 47;

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

const getStageAvatar = (stage: string) => {
  const configs: Record<string, { char: string; color: string; label: string }> = {
    'Prospect': { char: '', color: 'bg-slate-400', label: 'Prospect' },
    'Qualified': { char: 'Q', color: 'bg-blue-500', label: 'Qualified' },
    'Proposal': { char: 'P', color: 'bg-amber-500', label: 'Proposal' },
    'Negotiation': { char: 'N', color: 'bg-violet-500', label: 'Negotiation' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500', label: 'Term Sheet' },
    'Won': { char: 'W', color: 'bg-green-500', label: 'Won' }
  };
  return configs[stage] || { char: '', color: 'bg-slate-400', label: stage };
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarSize = (depth: number) => {
  if (depth === 0) return 'w-8 h-8';
  if (depth === 1) return 'w-7 h-7';
  return 'w-6 h-6';
};

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
  const spineLeft = (depth * INDENT_PX) + ROOT_SPINE_LEFT;

  return (
    <div className="relative overflow-visible bg-orange-50/30 border-l-2 border-orange-500">
      <div
        className="absolute w-[2px] bg-slate-900"
        style={{
          left: `${spineLeft}px`,
          top: '-12px',
          bottom: '-12px'
        }}
      />

      <div
        className="absolute h-[2px] bg-slate-900"
        style={{
          left: `${spineLeft}px`,
          top: '24px',
          width: '16px'
        }}
      />

      <div
        className="flex items-start gap-3 py-3 pr-4 relative z-10"
        style={{ paddingLeft: `${spineLeft + 20}px` }}
      >
        <div className="relative">
          <button
            onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
            className="flex-shrink-0"
          >
            <Avatar className="w-7 h-7 border-2 border-orange-500">
              {assignedUser?.avatar_url ? (
                <AvatarImage src={assignedUser.avatar_url} alt={assignedUser.full_name} />
              ) : null}
              <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                {assignedUser ? getInitials(assignedUser.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
          </button>

          {showAssigneeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px] max-h-64 overflow-auto">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onAssigneeChange(u.id);
                    setShowAssigneeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-sm"
                >
                  <Avatar className="w-6 h-6">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                    <AvatarFallback className="text-xs bg-slate-200">{getInitials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{u.full_name}</span>
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
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && summary.trim()) {
                e.preventDefault();
                onSave();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
              }
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
              }
            }}
            placeholder="Type task description (Cmd+Enter to save, Esc to cancel)..."
            className="w-full text-sm leading-relaxed bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <button
              className="p-1.5 hover:bg-slate-100 rounded transition-colors pointer-events-none"
              title={dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set due date'}
            >
              <Calendar className="w-4 h-4 text-slate-600" />
            </button>
          </div>

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
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === currentUserId;
  const isUnassigned = !task.assignedToId;
  const isAddingHere = addingToTaskId === task.id;

  const spineLeft = (depth * INDENT_PX) + ROOT_SPINE_LEFT;

  return (
    <>
      <div className="relative flex items-start py-3 pr-4 overflow-visible group hover:bg-slate-50/30 transition-colors">
        <div
          className="absolute w-[2px] bg-slate-900 z-0"
          style={{
            left: `${spineLeft}px`,
            top: '-12px',
            bottom: isLast && !isAddingHere && (!hasChildren || !isExpanded) ? '50%' : '-12px'
          }}
        />

        <div
          className="absolute h-[2px] bg-slate-900 z-0"
          style={{
            left: `${spineLeft}px`,
            top: '50%',
            width: '20px'
          }}
        />

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleExpand(task.id);
            }}
            className="absolute bg-slate-900 rounded-full w-2.5 h-2.5 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform z-10"
            style={{
              left: `${spineLeft - 5}px`,
              top: 'calc(50% - 5px)'
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minus className="w-2 h-2 text-white" />
            ) : (
              <Plus className="w-2 h-2 text-white" />
            )}
          </button>
        )}

        <div
          className="flex items-start gap-3 relative z-10 flex-1"
          style={{ paddingLeft: `${spineLeft + 24}px` }}
        >
          {isUnassigned ? (
            <button
              onClick={() => onPickup(task.id, task.summary)}
              className="flex-shrink-0 group/pickup"
              title="Pickup this task"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 group-hover/pickup:border-orange-500 group-hover/pickup:bg-orange-50 transition-all">
                <Hand className="w-4 h-4 text-slate-400 group-hover/pickup:text-orange-500 transition-colors" />
              </div>
            </button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0 cursor-default">
                    <Avatar className={cn(getAvatarSize(depth), isMine && 'ring-2 ring-orange-500 ring-offset-1')}>
                      {task.assigneeAvatar && (
                        <AvatarImage src={task.assigneeAvatar} alt={task.assigneeName} />
                      )}
                      <AvatarFallback className="text-xs bg-slate-200 font-bold">
                        {task.assigneeName ? getInitials(task.assigneeName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{task.assigneeName || 'Unassigned'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
            <p className={cn(
              "text-sm leading-relaxed",
              isMine ? "font-bold text-slate-900" : "font-medium text-slate-700",
              isCompleted && "line-through opacity-60"
            )}>
              {task.summary}
            </p>

            {task.dueDate && (
              <div className="text-xs text-slate-400 font-medium">
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
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          <div className="relative h-8 flex items-center" style={{ paddingLeft: `${spineLeft + INDENT_PX}px` }}>
            <div
              className="absolute w-[2px] bg-slate-900"
              style={{
                left: `${spineLeft + INDENT_PX}px`,
                top: '-12px',
                height: isAddingHere ? 'calc(100% + 12px)' : '16px'
              }}
            />

            {!isAddingHere && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddChildTo(task.id, dealId);
                }}
                className="relative ml-4 w-5 h-5 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-red-500 font-bold text-sm hover:bg-red-50 hover:scale-110 transition-all z-50 shadow-sm"
                title="Add subtask"
              >
                +
              </button>
            )}
          </div>
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

const DealThread: React.FC<DealThreadProps> = ({
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
  const stageConfig = getStageAvatar(group.deal.stage);
  const taskTree = buildTaskTree(group.tasks);
  const isDealExpanded = expandedDeals.has(group.deal.id);
  const isAddingRoot = addingRootToDealId === group.deal.id;

  return (
    <div className="relative">
      <div className="relative flex items-center gap-3 py-3 border-b border-slate-100">
        <button
          onClick={() => onToggleDealExpand(group.deal.id)}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronRight className={cn("w-5 h-5 transition-transform", isDealExpanded && "rotate-90")} />
        </button>

        <div
          className={`w-8 h-8 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {stageConfig.char}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base text-slate-900 truncate">{group.deal.name}</h3>
            {group.deal.value && (
              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                {group.deal.value} MW
              </span>
            )}
            <span className="text-xs font-medium text-slate-400 ml-auto">
              {group.completed_tasks}/{group.total_tasks}
            </span>
          </div>
        </div>

        {group.total_tasks > 0 && (
          <div className="absolute left-12 right-0 bottom-0 h-0.5 bg-slate-200">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${group.progress}%` }}
            />
          </div>
        )}
      </div>

      {isDealExpanded && (
        <div className="relative">
          <div
            className="absolute w-[2px] bg-slate-900"
            style={{
              left: `${ROOT_SPINE_LEFT}px`,
              top: '0',
              bottom: '0'
            }}
          />

          {taskTree.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              dealId={group.deal.id}
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
              onAssigneeChange={onNewTaskAssigneeChange}
              onSummaryChange={onNewTaskSummaryChange}
              onDueDateChange={onNewTaskDueDateChange}
              onSave={onSaveNewTask}
              onCancel={onCancelNewTask}
            />
          )}

          <div className="relative h-8 flex items-center" style={{ paddingLeft: `${ROOT_SPINE_LEFT}px` }}>
            <div
              className="absolute w-[2px] bg-slate-900"
              style={{
                left: `${ROOT_SPINE_LEFT}px`,
                top: '-12px',
                height: isAddingRoot ? 'calc(100% + 12px)' : '16px'
              }}
            />

            {!isAddingRoot && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddRootTask(group.deal.id);
                }}
                className="relative ml-4 w-5 h-5 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-red-500 font-bold text-sm hover:bg-red-50 hover:scale-110 transition-all z-50 shadow-sm"
                title="Add root task"
              >
                +
              </button>
            )}
          </div>
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
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  const [addingToTaskId, setAddingToTaskId] = useState<string | null>(null);
  const [addingRootToDealId, setAddingRootToDealId] = useState<string | null>(null);
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

  const fetchTaskThreads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let targetUserId = user.id;
      let filterMode = 'mine';

      if (hierarchyView === 'team') {
        if (isAdmin && selectedMemberId !== 'all') {
          targetUserId = selectedMemberId;
          filterMode = 'mine';
        } else {
          filterMode = 'all';
        }
      }

      console.log('Fetching tasks with:', { targetUserId, filterMode });

      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: targetUserId,
        p_filter: filterMode
      });

      if (error) throw error;

      console.log('Fetched deal groups:', data);
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
  }, [user?.id, hierarchyView, selectedMemberId]);

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

  const handleAddRootTask = (dealId: string) => {
    console.log('Adding root task to deal:', dealId);
    setAddingRootToDealId(dealId);
    setAddingToDealId(dealId);
    setAddingToTaskId(null);
    setNewTaskSummary('');
    setNewTaskAssignee(user?.id || '');
    setNewTaskDueDate('');
    setExpandedDeals(prev => new Set(prev).add(dealId));
  };

  const handleAddChildTask = (parentId: string, dealId: string) => {
    console.log('Adding child task to:', parentId, 'dealId:', dealId);
    setAddingToTaskId(parentId);
    setAddingRootToDealId(null);
    setAddingToDealId(dealId);
    setNewTaskSummary('');
    setNewTaskAssignee(user?.id || '');
    setNewTaskDueDate('');
    setExpandedTasks(prev => new Set(prev).add(parentId));
  };

  const handleSaveTask = async () => {
    console.log('Saving task:', { newTaskSummary, addingToDealId, addingToTaskId, newTaskAssignee });

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

      console.log('Inserting task:', insertData);
      const { error, data } = await supabase.from('activities').insert(insertData).select();

      if (error) throw error;

      console.log('Task created:', data);
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
      fetchCounts();
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
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded transition-all",
                  hierarchyView === 'mine'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Mine {myTasksCount > 0 && `(${myTasksCount})`}
              </button>
              <button
                onClick={() => setHierarchyView('team')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded transition-all",
                  hierarchyView === 'team'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Team {teamTasksCount > 0 && `(${teamTasksCount})`}
              </button>
            </div>

            {hierarchyView === 'team' && isAdmin && (
              <div className="relative flex-shrink-0">
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
                  <Users className="w-3 h-3" />
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
        <div className="space-y-8">
          {filteredDealGroups.map(group => (
            <DealThread
              key={group.deal.id}
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
          ))}
        </div>
      )}
    </div>
  );
};
