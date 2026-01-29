import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Square, CheckSquare, LayoutDashboard, Search, Filter, X, Users, User, ChevronDown as ChevronDownIcon, Calendar, Plus, Minus, Sparkles, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { isPast, parseISO, format, isToday, addDays, startOfWeek, addWeeks } from 'date-fns';

type ViewMode = 'mine' | 'team';

interface Task {
  id: string;
  summary: string;
  task_status: string;
  due_date?: string;
  assigned_to_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  parent_task_id?: string;
  thread_depth: number;
  created_at: string;
  children?: Task[];
  root_deal_id?: string;
}

interface DealThread {
  id: string;
  name: string;
  stage: string;
  mw: number;
  account_name: string;
  tasks: Task[];
}

const getStageAvatar = (stage: string) => {
  const s = (stage || '').toLowerCase().trim();

  if (s.includes('prospect')) {
    return { color: 'bg-slate-200 text-slate-500', char: '•' };
  }
  if (s.includes('qualif')) {
    return { color: 'bg-blue-500 text-white', char: 'Q' };
  }
  if (s.includes('proposal')) {
    return { color: 'bg-amber-500 text-white', char: 'P' };
  }
  if (s.includes('negotiat')) {
    return { color: 'bg-purple-500 text-white', char: 'N' };
  }
  if (s.includes('term')) {
    return { color: 'bg-teal-500 text-white', char: 'T' };
  }
  if (s.includes('won')) {
    return { color: 'bg-emerald-500 text-white', char: 'W' };
  }

  return { color: 'bg-slate-100 text-slate-400', char: '?' };
};

export function ZaapScreenTwo() {
  const { user } = useAuth();
  const { users } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [dealThreads, setDealThreads] = useState<DealThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const fetchDealThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const filterMode = viewMode === 'mine' ? 'my' : 'all';

      const { data, error } = await supabase.rpc('get_deal_threads_view', {
        p_view_mode: filterMode,
      });

      if (error) throw error;

      const threads = data || [];
      setDealThreads(threads);
    } catch (error) {
      console.error('Error fetching deal threads:', error);
      toast.error('Failed to load deal stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealThreads();
  }, [viewMode, user]);

  const buildTaskTree = (tasks: Task[]): Task[] => {
    if (!tasks || tasks.length === 0) return [];

    const taskMap = new Map<string, Task & { children: Task[] }>();
    const roots: Task[] = [];

    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        taskMap.get(task.parent_task_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const completeTask = async (taskId: string, taskSummary: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update({ task_status: 'Completed' })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task Completed');
      fetchDealThreads();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const pickupTask = async (taskId: string, taskSummary: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          assigned_to_id: user.id,
          task_status: 'In Progress'
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task Assigned');
      fetchDealThreads();
    } catch (error) {
      console.error('Error picking up task:', error);
      toast.error('Failed to pickup task');
    }
  };

  const updateTaskDueDate = async (taskId: string, newDate: string | null) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ due_date: newDate })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Due date updated');
      fetchDealThreads();
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const createSubTask = async (parentTaskId: string, dealId: string, summary: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          summary: summary,
          activity_type: 'Task',
          task_status: 'To Do',
          assigned_to_id: user.id,
          parent_task_id: parentTaskId,
          linked_opportunity_id: dealId,
          created_by_id: user.id
        });

      if (error) throw error;

      toast.success('Sub-task created');
      fetchDealThreads();
    } catch (error) {
      console.error('Error creating sub-task:', error);
      toast.error('Failed to create sub-task');
    }
  };

  const calculateProgress = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.task_status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const toggleDeal = (dealId: string) => {
    setExpandedDeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        newSet.add(dealId);
      }
      return newSet;
    });
  };

  const goToPulse = () => {
    navigate('/?view=pulse');
  };

  const filteredThreads = dealThreads.filter(thread => {
    const query = search.toLowerCase();
    return thread.name.toLowerCase().includes(query) ||
           thread.account_name.toLowerCase().includes(query);
  });

  const myThreadsCount = dealThreads.length;
  const teamThreadsCount = dealThreads.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading threads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Zaap</h1>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deals or tasks..."
                className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => toast.info('Filters', { description: 'Coming soon' })}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex-shrink-0"
            >
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* View Toggle: Me | Team */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('mine')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'mine'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-orange-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Me</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {myThreadsCount}
              </span>
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'team'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-orange-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Team</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {teamThreadsCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Deal Threads List */}
      {filteredThreads.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center mx-auto mb-4">
              <Radar className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Threads</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {search ? 'No threads match your search.' : 'No tasks match your current view. Find deals in Pulse to create new threads.'}
            </p>
            {!search && (
              <Button
                onClick={goToPulse}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                Go to Pulse
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {filteredThreads.map((thread) => (
            <DealThreadItem
              key={thread.id}
              thread={thread}
              userId={user?.id || ''}
              users={users}
              onComplete={completeTask}
              onPickup={pickupTask}
              onUpdateDueDate={updateTaskDueDate}
              onCreateSubTask={createSubTask}
              buildTaskTree={buildTaskTree}
              calculateProgress={calculateProgress}
              isExpanded={expandedDeals.has(thread.id)}
              onToggle={() => toggleDeal(thread.id)}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DealThreadItemProps {
  thread: DealThread;
  userId: string;
  users: Array<{ id: string; name: string; avatar_url?: string; role?: string }>;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  onUpdateDueDate: (taskId: string, date: string | null) => void;
  onCreateSubTask: (parentTaskId: string, dealId: string, summary: string) => void;
  buildTaskTree: (tasks: Task[]) => Task[];
  calculateProgress: (tasks: Task[]) => number;
  isExpanded: boolean;
  onToggle: () => void;
  navigate: (path: string) => void;
}

function DealThreadItem({
  thread,
  userId,
  users,
  onComplete,
  onPickup,
  onUpdateDueDate,
  onCreateSubTask,
  buildTaskTree,
  calculateProgress,
  isExpanded,
  onToggle,
  navigate
}: DealThreadItemProps) {
  const taskTree = buildTaskTree(thread.tasks);
  const progress = calculateProgress(thread.tasks);
  const stageAvatar = getStageAvatar(thread.stage);

  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      {/* Deal Header */}
      <button
        onClick={onToggle}
        className="relative w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
      >
        {/* Stage Avatar */}
        <div className={`w-7 h-7 rounded-full ${stageAvatar.color} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
          {stageAvatar.char}
        </div>

        {/* Deal Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <h3
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/?view=opportunities&id=${thread.id}`);
              }}
              className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              {thread.name}
            </h3>
            <span className="text-[10px] h-4 px-1.5 flex items-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded whitespace-nowrap">
              {thread.mw} MW
            </span>
          </div>
        </div>

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {/* Task List */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          {taskTree.length > 0 ? (
            <>
              {taskTree.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  dealId={thread.id}
                  depth={0}
                  userId={userId}
                  users={users}
                  onComplete={onComplete}
                  onPickup={onPickup}
                  onUpdateDueDate={onUpdateDueDate}
                  onCreateSubTask={onCreateSubTask}
                />
              ))}
            </>
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">No tasks</p>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  dealId: string;
  depth: number;
  userId: string;
  users: Array<{ id: string; name: string; avatar_url?: string; role?: string }>;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  onUpdateDueDate: (taskId: string, date: string | null) => void;
  onCreateSubTask: (parentTaskId: string, dealId: string, summary: string) => void;
}

function TaskRow({ task, dealId, depth, userId, users, onComplete, onPickup, onUpdateDueDate, onCreateSubTask }: TaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskSummary, setNewTaskSummary] = useState('');

  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === userId;
  const isUnassigned = !task.assigned_to_id;
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;
  const hasChildren = task.children && task.children.length > 0;

  const handleDateShortcut = (type: 'tomorrow' | 'nextWeek' | 'nextMonth' | 'clear') => {
    let newDate: string | null = null;

    switch (type) {
      case 'tomorrow':
        newDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        break;
      case 'nextWeek':
        newDate = format(addWeeks(startOfWeek(new Date()), 1), 'yyyy-MM-dd');
        break;
      case 'nextMonth':
        newDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
        break;
      case 'clear':
        newDate = null;
        break;
    }

    onUpdateDueDate(task.id, newDate);
  };

  const handleAddSubTask = async () => {
    if (!newTaskSummary.trim()) return;

    await onCreateSubTask(task.id, dealId, newTaskSummary);
    setNewTaskSummary('');
    setIsAdding(false);
    setIsExpanded(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskSummary('');
    }
  };

  const paddingLeft = 16 + depth * 32;
  const spineLeft = depth > 0 ? (16 + (depth - 1) * 32) : 0;

  return (
    <>
      <div
        className="relative flex items-start gap-3 py-2 px-3 min-h-[40px] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Solid Lines (Sketch Style) */}
        {depth > 0 && (
          <>
            {/* Vertical Spine */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-slate-400"
              style={{ left: `${spineLeft + 11}px` }}
            />
            {/* Horizontal Connector */}
            <div
              className="absolute top-5 h-0.5 bg-slate-900 dark:bg-slate-400 w-4"
              style={{ left: `${spineLeft + 11}px` }}
            />
          </>
        )}

        {/* Circular Toggle (The "O" or "-") */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-5 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-600 dark:border-slate-300 bg-white dark:bg-slate-900 z-10 flex items-center justify-center hover:scale-110 transition-transform"
            style={{ left: `${spineLeft + 5}px` }}
          >
            {isExpanded ? (
              <Minus className="w-2 h-2 text-slate-900 dark:text-slate-100" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-100" />
            )}
          </button>
        ) : (
          depth > 0 && (
            <div
              className="absolute top-5 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-400 z-10"
              style={{ left: `${spineLeft + 8}px` }}
            />
          )
        )}

        {/* Task Content */}
        <div className="flex-1 min-w-0 flex items-center flex-wrap gap-2">
          {/* Checkbox */}
          <button
            onClick={() => {
              if (isUnassigned) {
                onPickup(task.id, task.summary);
              } else if (isMine && !isCompleted) {
                onComplete(task.id, task.summary);
              }
            }}
            className="mt-0.5 flex-shrink-0"
          >
            {isCompleted ? (
              <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Square className="w-5 h-5 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300" />
            )}
          </button>

          {/* TEXT HIGHLIGHT (Yellow Highlighter style on text only) */}
          <span
            className={`text-sm leading-snug ${
              isCompleted
                ? 'line-through opacity-50 text-slate-500 dark:text-slate-400'
                : isMine
                  ? 'font-bold bg-yellow-100 dark:bg-yellow-900/40 text-slate-900 dark:text-white px-1 rounded'
                  : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {task.summary}
          </span>

          {/* RED (+) ADD BUTTON (Always Visible) */}
          {!isCompleted && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full p-0.5 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* AI Suggestion Hint */}
          {depth === 0 && !isCompleted && (
            <button className="text-[10px] text-orange-400 cursor-pointer flex items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
              <Sparkles className="w-3 h-3" />
              <span>Suggest</span>
            </button>
          )}
        </div>

        {/* Right: Due Date */}
        {task.due_date && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`text-[10px] whitespace-nowrap font-medium hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : isToday(parseISO(task.due_date))
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {format(parseISO(task.due_date), 'MMM d')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Change due date:
                </div>
                <button
                  onClick={() => handleDateShortcut('tomorrow')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Tomorrow</span>
                </button>
                <button
                  onClick={() => handleDateShortcut('nextWeek')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Next Week</span>
                </button>
                <button
                  onClick={() => handleDateShortcut('nextMonth')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">30 Days</span>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                <button
                  onClick={() => handleDateShortcut('clear')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                >
                  <X className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">Clear Date</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Inline Input */}
      {isAdding && (
        <div
          className="relative flex items-center gap-2 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
          style={{ paddingLeft: `${paddingLeft + 32}px` }}
        >
          {/* Continuation Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-300 dark:bg-orange-600"
            style={{ left: `${spineLeft + 11}px` }}
          />
          <input
            autoFocus
            placeholder="New sub-task..."
            className="flex-1 text-sm border-b border-orange-300 dark:border-orange-600 outline-none bg-transparent px-2 py-1"
            value={newTaskSummary}
            onChange={(e) => setNewTaskSummary(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {/* Recursive Children */}
      {isExpanded &&
        task.children?.map((child) => (
          <TaskRow
            key={child.id}
            task={child}
            dealId={dealId}
            depth={depth + 1}
            userId={userId}
            users={users}
            onComplete={onComplete}
            onPickup={onPickup}
            onUpdateDueDate={onUpdateDueDate}
            onCreateSubTask={onCreateSubTask}
          />
        ))}
    </>
  );
}
