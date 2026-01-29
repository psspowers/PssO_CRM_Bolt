import { useState, useEffect } from 'react';
import { Trophy, Zap, Hand, Clock, Circle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { isPast, parseISO, format, isToday } from 'date-fns';
import confetti from 'canvas-confetti';

type FilterMode = 'all' | 'mine' | 'delegated';

interface Task {
  id: string;
  summary: string;
  details?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assignedToId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  parentTaskId?: string;
  depth: number;
  createdAt: string;
  children?: Task[];
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
  tasks: Task[];
}

interface TaskMasterProps {
  onClose: () => void;
}

export function TaskMaster({ onClose }: TaskMasterProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDealThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: filter,
      });

      if (error) throw error;

      const dealGroups = Array.isArray(data) ? data : (data ? [data] : []);
      setDealGroups(dealGroups);
    } catch (error) {
      console.error('Error fetching deal threads:', error);
      toast.error('Failed to load task stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealThreads();
  }, [filter, user]);

  const buildTaskTree = (tasks: Task[]): Task[] => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    const roots: Task[] = [];

    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
        taskMap.get(task.parentTaskId)!.children!.push(node);
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
        .update({ assigned_to_id: user.id })
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

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b']
      });

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

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Velocity Command</h1>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Done
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
              filter === 'all'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            All
            {filter === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
              filter === 'mine'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Mine
            {filter === 'mine' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setFilter('delegated')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
              filter === 'delegated'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Delegated
            {filter === 'delegated' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Thread Stream */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Loading threads...</p>
            </div>
          </div>
        ) : dealGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">All Clear!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">No tasks for this view</p>
            </div>
          </div>
        ) : (
          <div>
            {dealGroups.map((group) => (
              <DealThread
                key={group.deal.id}
                group={group}
                userId={user?.id || ''}
                onComplete={completeTask}
                onPickup={pickupTask}
                buildTaskTree={buildTaskTree}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DealThreadProps {
  group: DealGroup;
  userId: string;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  buildTaskTree: (tasks: Task[]) => Task[];
}

function DealThread({ group, userId, onComplete, onPickup, buildTaskTree }: DealThreadProps) {
  const taskTree = buildTaskTree(group.tasks);
  const flatTasks = group.tasks;

  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      {/* Deal Header - The "Original Post" */}
      <div className="flex gap-3 px-4 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
        {/* Left Column - Icon/Avatar */}
        <div className="flex flex-col items-center pt-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          {/* Vertical Line */}
          {flatTasks.length > 0 && (
            <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 mt-2" />
          )}
        </div>

        {/* Right Column - Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900 dark:text-white">{group.deal.name}</span>
            <span className="text-slate-500 dark:text-slate-400 text-sm">·</span>
            <span className="text-slate-500 dark:text-slate-400 text-sm">{group.deal.account_name}</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Badge className={`text-xs px-2 py-0.5 font-semibold ${getStageColor(group.deal.stage)}`}>
              {group.deal.stage}
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.completed_tasks}/{group.total_tasks} complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <Progress
              value={group.progress}
              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800"
              indicatorClassName="bg-green-500"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {group.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Task Replies */}
      {flatTasks.length > 0 && (
        <div>
          {flatTasks.map((task, index) => (
            <TaskReply
              key={task.id}
              task={task}
              isLast={index === flatTasks.length - 1}
              userId={userId}
              onComplete={onComplete}
              onPickup={onPickup}
              allTasks={flatTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    'Prospecting': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    'Qualification': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Proposal': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    'Negotiation': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'Closing': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'Won': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  };
  return colors[stage] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
}

interface TaskReplyProps {
  task: Task;
  isLast: boolean;
  userId: string;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  allTasks: Task[];
}

function TaskReply({ task, isLast, userId, onComplete, onPickup, allTasks }: TaskReplyProps) {
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === userId;
  const isUnassigned = !task.assignedToId;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isCompleted;

  const parentTask = task.parentTaskId ? allTasks.find(t => t.id === task.parentTaskId) : null;

  return (
    <div className="flex gap-3 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors border-l-2 border-transparent hover:border-l-slate-200 dark:hover:border-l-slate-800">
      {/* Left Column - Avatar + Line */}
      <div className="flex flex-col items-center pt-1">
        {task.assigneeAvatar || task.assigneeName ? (
          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white dark:ring-slate-950">
            <AvatarImage src={task.assigneeAvatar || undefined} />
            <AvatarFallback className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {task.assigneeName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
          </div>
        )}

        {/* Vertical Line */}
        {!isLast && (
          <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 mt-2" />
        )}
      </div>

      {/* Right Column - Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {task.assigneeName || 'Unassigned'}
          </span>
          {task.assigneeName && (
            <>
              <span className="text-slate-500 dark:text-slate-400 text-sm">·</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                {format(parseISO(task.createdAt), 'MMM d')}
              </span>
            </>
          )}
        </div>

        {/* In Reply To */}
        {parentTask && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Replying to <span className="text-blue-500 dark:text-blue-400">@{parentTask.assigneeName || 'parent'}</span>
          </div>
        )}

        {/* Task Content */}
        <div className="mb-2">
          <p className={`text-sm leading-relaxed ${
            isCompleted
              ? 'line-through text-slate-400 dark:text-slate-600'
              : 'text-slate-900 dark:text-white'
          }`}>
            {task.summary}
          </p>
          {task.details && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {task.details}
            </p>
          )}
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Status */}
          <div className={`inline-flex items-center gap-1 text-xs ${
            isCompleted
              ? 'text-green-600 dark:text-green-400'
              : task.status === 'In Progress'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
          }`}>
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">{task.status}</span>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className={`inline-flex items-center gap-1 text-xs font-medium ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : isToday(parseISO(task.dueDate))
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-500 dark:text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {format(parseISO(task.dueDate), 'MMM d, h:mm a')}
              </div>
            </>
          )}

          {/* Priority */}
          {task.priority && task.priority !== 'Low' && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className={`text-xs font-semibold ${
                task.priority === 'High'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {task.priority} Priority
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {isUnassigned && !isCompleted && (
            <button
              onClick={() => onPickup(task.id, task.summary)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800 transition-all"
            >
              <Hand className="w-3.5 h-3.5" />
              Pick up task
              <span className="flex items-center gap-0.5 ml-0.5 text-amber-700 dark:text-amber-300">
                +5 <Zap className="w-3 h-3" />
              </span>
            </button>
          )}

          {isMine && !isCompleted && (
            <button
              onClick={() => onComplete(task.id, task.summary)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-full transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete task
              <span className="flex items-center gap-0.5">
                +10 <Zap className="w-3 h-3" />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
