import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Clock, Circle, CheckCircle2, Radar, Hand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isPast, parseISO, format, isToday } from 'date-fns';
import confetti from 'canvas-confetti';

type ViewMode = 'me' | 'team';

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

// Stage Avatar Helper - Returns color and character
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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('me');
  const [dealThreads, setDealThreads] = useState<DealThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());

  const fetchDealThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const filterMode = viewMode === 'me' ? 'my' : 'all';

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

  return (
    <div className="pb-24">
      {/* Control Row - Me | Team Toggle */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <button
              onClick={() => setViewMode('me')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'me'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Me
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'team'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Team
            </button>
          </div>

          {/* Team Dropdown */}
          {viewMode === 'team' && (
            <select
              className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              onChange={() => toast.info('Team filter', { description: 'Coming soon' })}
            >
              <option>All Team</option>
              <option>Sales</option>
              <option>Engineering</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading threads...</p>
            </div>
          </div>
        ) : dealThreads.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center mx-auto mb-4">
                <Radar className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Threads</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                No tasks match your current view. Find deals in Pulse to create new threads.
              </p>
              <Button
                onClick={goToPulse}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                Go to Pulse
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dealThreads.map((thread) => (
              <DealThreadItem
                key={thread.id}
                thread={thread}
                userId={user?.id || ''}
                onComplete={completeTask}
                onPickup={pickupTask}
                buildTaskTree={buildTaskTree}
                calculateProgress={calculateProgress}
                isExpanded={expandedDeals.has(thread.id)}
                onToggle={() => toggleDeal(thread.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DealThreadItemProps {
  thread: DealThread;
  userId: string;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  buildTaskTree: (tasks: Task[]) => Task[];
  calculateProgress: (tasks: Task[]) => number;
  isExpanded: boolean;
  onToggle: () => void;
}

function DealThreadItem({
  thread,
  userId,
  onComplete,
  onPickup,
  buildTaskTree,
  calculateProgress,
  isExpanded,
  onToggle
}: DealThreadItemProps) {
  const taskTree = buildTaskTree(thread.tasks);
  const progress = calculateProgress(thread.tasks);
  const stageAvatar = getStageAvatar(thread.stage);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Deal Header (Level 0) - Large Card */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
      >
        {/* Large Stage Avatar */}
        <div className={`w-14 h-14 rounded-full ${stageAvatar.color} flex items-center justify-center flex-shrink-0 font-bold text-2xl shadow-lg`}>
          {stageAvatar.char}
        </div>

        {/* Deal Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">
              {thread.name}
            </h3>
            {/* MW Badge */}
            <Badge className="whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              {thread.mw} MW
            </Badge>
          </div>
          {/* Progress Bar */}
          <Progress
            value={progress}
            className="h-2 bg-slate-100 dark:bg-slate-800"
            indicatorClassName="bg-orange-500"
          />
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-slate-400" />
          ) : (
            <ChevronRight className="w-6 h-6 text-slate-400" />
          )}
        </div>
      </button>

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
                  onComplete={onComplete}
                  onPickup={onPickup}
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
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
}

function TaskRow({ task, depth, userId, onComplete, onPickup }: TaskRowProps) {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === userId;
  const isUnassigned = !task.assigned_to_id;
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;

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
          {/* Status Icon & Avatar */}
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

            {task.assignee_avatar || task.assignee_name ? (
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarImage src={task.assignee_avatar || undefined} />
                <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {task.assignee_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Circle className="w-3 h-3 text-slate-400 dark:text-slate-600" />
              </div>
            )}
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

            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : isToday(parseISO(task.due_date))
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-500 dark:text-slate-400'
              }`}>
                <Clock className="w-3 h-3" />
                {format(parseISO(task.due_date), 'MMM d')}
              </div>
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
              onComplete={onComplete}
              onPickup={onPickup}
            />
          ))}
        </>
      )}
    </>
  );
}
