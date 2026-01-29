import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Clock, Circle, CheckCircle2, Radar, Hand, LayoutDashboard, Search, Filter, X, Users, User, ChevronDown as ChevronDownIcon, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { isPast, parseISO, format, isToday, addDays, startOfWeek, addWeeks } from 'date-fns';
import confetti from 'canvas-confetti';

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

export function ZaapScreen() {
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
      const { error: updateError } = await supabase
        .from('activities')
        .update({ task_status: 'Completed' })
        .eq('id', taskId);

      if (updateError) throw updateError;

      const { error: wattsError } = await supabase
        .from('watts_ledger')
        .insert({
          user_id: user.id,
          amount: 10,
          type: 'complete_task',
          description: `Completed: ${taskSummary}`,
          related_entity_id: taskId,
          related_entity_type: 'Activity'
        });

      if (wattsError) console.error('Watts error:', wattsError);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fbbf24']
      });

      toast.success('+10 Watts Earned!', {
        description: taskSummary,
        duration: 3000
      });

      fetchDealThreads();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const pickupTask = async (taskId: string, taskSummary: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          assigned_to_id: user.id,
          task_status: 'In Progress'
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      const { error: wattsError } = await supabase
        .from('watts_ledger')
        .insert({
          user_id: user.id,
          amount: 5,
          type: 'pickup_task',
          description: `Picked up: ${taskSummary}`,
          related_entity_id: taskId,
          related_entity_type: 'Activity'
        });

      if (wattsError) console.error('Watts error:', wattsError);

      toast.success('+5 Watts Earned!', {
        description: taskSummary,
        duration: 3000
      });

      fetchDealThreads();
    } catch (error) {
      console.error('Error picking up task:', error);
      toast.error('Failed to pickup task');
    }
  };

  const updateTaskAssignee = async (taskId: string, newAssigneeId: string | null) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ assigned_to_id: newAssigneeId })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Assignee updated');
      fetchDealThreads();
    } catch (error) {
      console.error('Error updating assignee:', error);
      toast.error('Failed to update assignee');
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

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Zaap</h1>
          </div>

          {/* Search & Filter - Moved to Header Row */}
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

        {/* Hierarchy View Toggle - Mine vs Team */}
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
              <span className="hidden sm:inline">Mine</span>
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

          {/* Team Member Drill-Down Filter */}
          {viewMode === 'team' && (
            <div className="relative flex-shrink-0 animate-in fade-in slide-in-from-left-2">
              <select
                className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold pl-2 pr-6 py-1.5 rounded-full border-none focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none w-28 truncate"
              >
                <option value="all">All Team</option>
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                <ChevronDownIcon className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deal Threads List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading threads...</p>
          </div>
        </div>
      ) : filteredThreads.length === 0 ? (
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
        <div className="grid gap-3">
          {filteredThreads.map((thread) => (
            <DealThreadItem
              key={thread.id}
              thread={thread}
              userId={user?.id || ''}
              users={users}
              onComplete={completeTask}
              onPickup={pickupTask}
              onUpdateAssignee={updateTaskAssignee}
              onUpdateDueDate={updateTaskDueDate}
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
  users: Array<{ id: string; name: string; avatar_url?: string }>;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  onUpdateAssignee: (taskId: string, userId: string | null) => void;
  onUpdateDueDate: (taskId: string, date: string | null) => void;
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
  onUpdateAssignee,
  onUpdateDueDate,
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
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Deal Header (Level 0) */}
      <div className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
        {/* Large Stage Avatar */}
        <div className={`w-14 h-14 rounded-full ${stageAvatar.color} flex items-center justify-center flex-shrink-0 font-bold text-2xl shadow-lg`}>
          {stageAvatar.char}
        </div>

        {/* Deal Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/?view=opportunities&id=${thread.id}`);
              }}
              className="font-bold text-slate-900 dark:text-white text-lg truncate cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              {thread.name}
            </h3>
            <Badge className="whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              {thread.mw} MW
            </Badge>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-slate-100 dark:bg-slate-800"
            indicatorClassName="bg-orange-500"
          />
        </div>

        {/* Expand Icon */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-slate-400" />
          ) : (
            <ChevronRight className="w-6 h-6 text-slate-400" />
          )}
        </button>
      </div>

      {/* Task List with L-Shape Connectors */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 py-2">
          {taskTree.length > 0 ? (
            <>
              {taskTree.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  depth={1}
                  userId={userId}
                  users={users}
                  onComplete={onComplete}
                  onPickup={onPickup}
                  onUpdateAssignee={onUpdateAssignee}
                  onUpdateDueDate={onUpdateDueDate}
                />
              ))}
            </>
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-6">No tasks in this deal</p>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  depth: number;
  userId: string;
  users: Array<{ id: string; name: string; avatar_url?: string }>;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  onUpdateAssignee: (taskId: string, userId: string | null) => void;
  onUpdateDueDate: (taskId: string, date: string | null) => void;
}

function TaskRow({ task, depth, userId, users, onComplete, onPickup, onUpdateAssignee, onUpdateDueDate }: TaskRowProps) {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === userId;
  const isUnassigned = !task.assigned_to_id;
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;

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

  return (
    <>
      {/* Task Node with L-Shape Connector */}
      <div
        className="relative pl-8 py-3"
        style={{ paddingLeft: `${depth * 32}px` }}
      >
        {/* Vertical Line (Left Border) */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Horizontal Connector Line */}
        <div className="absolute left-6 top-8 w-4 h-px bg-slate-200 dark:bg-slate-700" />

        {/* Task Content */}
        <div
          className={`relative ml-6 flex items-start gap-3 py-3 px-4 rounded-lg transition-all ${
            isUnassigned && !isCompleted
              ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400'
              : isCompleted
                ? 'bg-slate-50 dark:bg-slate-900/30 opacity-60'
                : isMine
                  ? 'bg-orange-50/50 dark:bg-orange-900/10 border-l-4 border-orange-500'
                  : 'bg-slate-50 dark:bg-slate-900/20'
          }`}
        >
          {/* Status Icon & Assignee Avatar with Dropdown */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={() => !isCompleted && isMine && onComplete(task.id, task.summary)}
              disabled={isCompleted || !isMine}
              className={`transition-transform ${isMine && !isCompleted ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            >
              {!isCompleted ? (
                <Circle className={`w-5 h-5 ${isMine ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </button>

            {/* Assignee Avatar with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full">
                  {task.assignee_avatar || task.assignee_name ? (
                    <Avatar className="w-7 h-7 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all">
                      <AvatarImage src={task.assignee_avatar || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {task.assignee_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all">
                      <Circle className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Assign to:
                  </div>
                  <button
                    onClick={() => onUpdateAssignee(task.id, null)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <Circle className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Unassigned</span>
                  </button>
                  {users.filter(u => u.role && ['internal', 'admin', 'super_admin'].includes(u.role)).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => onUpdateAssignee(task.id, u.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {u.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{u.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm ${
                isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : isMine
                    ? 'font-bold text-slate-900 dark:text-white'
                    : isUnassigned
                      ? 'font-semibold text-yellow-900 dark:text-yellow-200'
                      : 'text-slate-700 dark:text-slate-300'
              }`}>
                {task.summary}
              </p>
              {isMine && !isCompleted && (
                <Badge className="text-[10px] px-1.5 py-0.5 font-bold bg-orange-500 text-white">
                  YOUR MOVE
                </Badge>
              )}
            </div>

            {/* Due Date with Popover */}
            {task.due_date && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex items-center gap-1 text-xs font-medium mt-1 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors ${
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : isToday(parseISO(task.due_date))
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {format(parseISO(task.due_date), 'MMM d')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
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

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUnassigned && !isCompleted && (
              <button
                onClick={() => onPickup(task.id, task.summary)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-full border border-yellow-300 dark:border-yellow-600 transition-all"
              >
                <Hand className="w-3 h-3" />
                +5⚡
              </button>
            )}

            {isMine && !isCompleted && (
              <button
                onClick={() => onComplete(task.id, task.summary)}
                className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 flex items-center justify-center transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render Children with Increased Depth */}
      {task.children && task.children.length > 0 && (
        <>
          {task.children.map(child => (
            <TaskRow
              key={child.id}
              task={child}
              depth={depth + 1}
              userId={userId}
              users={users}
              onComplete={onComplete}
              onPickup={onPickup}
              onUpdateAssignee={onUpdateAssignee}
              onUpdateDueDate={onUpdateDueDate}
            />
          ))}
        </>
      )}
    </>
  );
}
