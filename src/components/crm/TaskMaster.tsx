import { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, Zap, Hand, Clock, Circle, CheckCircle2, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isPast, parseISO, format, isToday } from 'date-fns';
import confetti from 'canvas-confetti';

type FilterMode = 'all' | 'my' | 'delegated';

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

interface TaskMasterProps {
  onClose: () => void;
}

const getStageAvatar = (stage: string) => {
  const stageMap: Record<string, { bg: string; text: string; letter: string }> = {
    'Prospecting': { bg: 'bg-slate-200', text: 'text-slate-600', letter: 'P' },
    'Qualification': { bg: 'bg-blue-500', text: 'text-white', letter: 'Q' },
    'Proposal': { bg: 'bg-amber-500', text: 'text-white', letter: 'P' },
    'Negotiation': { bg: 'bg-purple-500', text: 'text-white', letter: 'N' },
    'Term Sheet': { bg: 'bg-teal-500', text: 'text-white', letter: 'T' },
    'Won': { bg: 'bg-emerald-500', text: 'text-white', letter: 'W' },
    'Closing': { bg: 'bg-green-500', text: 'text-white', letter: 'C' },
  };
  return stageMap[stage] || { bg: 'bg-slate-300', text: 'text-slate-700', letter: '?' };
};

export function TaskMaster({ onClose }: TaskMasterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [dealThreads, setDealThreads] = useState<DealThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDealThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_deal_threads_view', {
        p_view_mode: filter,
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
  }, [filter, user]);

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

  const calculateWatts = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    return tasks.length * 10;
  };

  const goToPulse = () => {
    onClose();
    navigate('/?view=pulse');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">

      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Velocity Command</h1>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5"
          >
            Done
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="inline-flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filter === 'my'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Moves
            </button>
            <button
              onClick={() => setFilter('delegated')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filter === 'delegated'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Delegated
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading threads...</p>
            </div>
          </div>
        ) : dealThreads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm px-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center mx-auto mb-4">
                <Radar className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Threads</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                No tasks match your current filter. Find deals in Pulse to create new threads.
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
          <Accordion type="multiple" className="w-full">
            {dealThreads.map((thread) => (
              <DealThreadItem
                key={thread.id}
                thread={thread}
                userId={user?.id || ''}
                onComplete={completeTask}
                onPickup={pickupTask}
                buildTaskTree={buildTaskTree}
                calculateProgress={calculateProgress}
                calculateWatts={calculateWatts}
              />
            ))}
          </Accordion>
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
  calculateWatts: (tasks: Task[]) => number;
}

function DealThreadItem({ thread, userId, onComplete, onPickup, buildTaskTree, calculateProgress, calculateWatts }: DealThreadItemProps) {
  const taskTree = buildTaskTree(thread.tasks);
  const progress = calculateProgress(thread.tasks);
  const wattsAvailable = calculateWatts(thread.tasks);
  const stageAvatar = getStageAvatar(thread.stage);

  return (
    <AccordionItem value={thread.id} className="border-b border-slate-200 dark:border-slate-800">
      <AccordionTrigger className="hover:bg-slate-50 dark:hover:bg-slate-900/50 px-4 py-4 hover:no-underline">
        <div className="flex items-center gap-3 w-full">
          <div className={`w-12 h-12 rounded-full ${stageAvatar.bg} ${stageAvatar.text} flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-sm`}>
            {stageAvatar.letter}
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{thread.name}</h3>
              <Badge className="text-xs px-2 py-0.5 font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {thread.mw} MW
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <span>{thread.account_name}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />
                +{wattsAvailable}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Progress
                value={progress}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800"
                indicatorClassName="bg-orange-500"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[36px]">
                {progress}%
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info('AI Suggest', { description: 'Coming soon: AI will suggest task chains' });
            }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-orange-500 dark:hover:text-orange-400"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-2">
        {taskTree.length > 0 ? (
          <div className="space-y-0">
            {taskTree.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                depth={0}
                userId={userId}
                onComplete={onComplete}
                onPickup={onPickup}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-6">No tasks in this deal</p>
        )}
      </AccordionContent>
    </AccordionItem>
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

  const indentPadding = depth > 0 ? `ml-8 pl-${Math.min(depth * 4, 12)}` : '';

  return (
    <div className="relative">
      <div
        className={`flex items-start gap-3 py-3 border-l-4 transition-all ${indentPadding} ${
          isUnassigned && !isCompleted
            ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-600'
            : isCompleted
              ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 opacity-60'
              : isMine
                ? 'bg-orange-50/60 dark:bg-orange-900/10 border-orange-500 dark:border-orange-600'
                : 'border-slate-200 dark:border-slate-700 opacity-80 grayscale-[0.2] hover:opacity-100 hover:grayscale-0'
        }`}
      >
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pl-3">
          <button
            onClick={() => !isCompleted && isMine && onComplete(task.id, task.summary)}
            disabled={isCompleted || !isMine}
            className={`transition-transform ${isMine && !isCompleted ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          >
            {!isCompleted ? (
              <Circle className={`w-4 h-4 ${isMine ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
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

        <div className="flex items-center gap-2 flex-shrink-0 pr-3">
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

      {task.children && task.children.length > 0 && (
        <div className="space-y-0">
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
        </div>
      )}
    </div>
  );
}
