import { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Zap, Hand, Clock, Circle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">

        {/* Compact Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Velocity Command</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dealGroups.reduce((sum, g) => sum + g.completed_tasks, 0)}/{dealGroups.reduce((sum, g) => sum + g.total_tasks, 0)} complete
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Segmented Control Ribbon */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-center">
            <div className="inline-flex gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('mine')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filter === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mine
              </button>
              <button
                onClick={() => setFilter('delegated')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filter === 'delegated'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Delegated
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading deal stream...</p>
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
            <div className="space-y-3">
              {dealGroups.map((group) => (
                <DealCard
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
    </div>
  );
}

interface DealCardProps {
  group: DealGroup;
  userId: string;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  buildTaskTree: (tasks: Task[]) => Task[];
}

function DealCard({ group, userId, onComplete, onPickup, buildTaskTree }: DealCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const taskTree = buildTaskTree(group.tasks);

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Prospecting': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      'Qualification': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'Proposal': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      'Negotiation': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      'Closing': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'Won': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    };
    return colors[stage] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{group.deal.name}</h3>
            <Badge className={`text-[10px] px-2 py-0.5 font-bold ${getStageColor(group.deal.stage)}`}>
              {group.deal.stage}
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.deal.account_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Progress
              value={group.progress}
              className="w-24 h-2 bg-slate-200 dark:bg-slate-700"
              indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-500"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[32px] text-right">
              {group.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Task List Body */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          {taskTree.length > 0 ? (
            taskTree.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                depth={0}
                userId={userId}
                onComplete={onComplete}
                onPickup={onPickup}
              />
            ))
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-6">No tasks in this deal</p>
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
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === userId;
  const isUnassigned = !task.assignedToId;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isCompleted;

  const getBackgroundStyle = () => {
    if (isCompleted) return 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70';
    if (isUnassigned) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    if (isMine) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
  };

  const getStatusPillStyle = () => {
    const statusStyles: Record<string, string> = {
      'Pending': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
      'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50',
      'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
      'Cancelled': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50',
    };
    return statusStyles[task.status] || statusStyles['Pending'];
  };

  return (
    <div className="relative">
      <div className={`${depth > 0 ? 'border-l-2 border-slate-300 dark:border-slate-600 pl-4 ml-4' : ''}`}>
        <div className={`flex items-start gap-2 p-3 rounded-lg border transition-all ${getBackgroundStyle()}`}>
          <button
            onClick={() => !isCompleted && isMine && onComplete(task.id, task.summary)}
            disabled={isCompleted || !isMine}
            className={`flex-shrink-0 mt-0.5 ${isMine && !isCompleted ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          >
            {!isCompleted ? (
              <Circle className={`w-4 h-4 ${isMine ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`text-xs font-semibold ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : isMine
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300'
            }`}>
              {task.summary}
            </h4>

            {task.details && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{task.details}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <button
                onClick={() => toast.info('Status change', { description: 'Coming soon' })}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${getStatusPillStyle()}`}
              >
                {task.status}
              </button>

              {isUnassigned && !isCompleted && (
                <button
                  onClick={() => onPickup(task.id, task.summary)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-md border border-amber-300 dark:border-amber-700 transition-all"
                >
                  <Hand className="w-3 h-3" />
                  Pickup +5⚡
                </button>
              )}

              {task.assigneeName && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                  <Avatar className="w-3 h-3">
                    <AvatarImage src={task.assigneeAvatar || undefined} />
                    <AvatarFallback className="text-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {task.assigneeName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-slate-700 dark:text-slate-300">{task.assigneeName.split(' ')[0]}</span>
                </div>
              )}

              {task.dueDate && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isOverdue
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
                    : isToday(parseISO(task.dueDate))
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}>
                  <Clock className="w-2.5 h-2.5" />
                  {format(parseISO(task.dueDate), 'MMM d')}
                </div>
              )}

              {task.priority && task.priority !== 'Low' && (
                <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  task.priority === 'High'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {task.priority}
                </div>
              )}
            </div>
          </div>

          {isMine && !isCompleted && (
            <button
              onClick={() => onComplete(task.id, task.summary)}
              className="px-2 py-1 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white text-[10px] font-bold rounded-md transition-colors shadow-sm flex items-center gap-1 flex-shrink-0"
            >
              Done
              <Zap className="w-3 h-3" />
            </button>
          )}
        </div>

        {task.children && task.children.length > 0 && (
          <div className="mt-2 space-y-2">
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
    </div>
  );
}
