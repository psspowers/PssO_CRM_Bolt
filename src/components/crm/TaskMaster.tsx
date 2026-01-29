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
  const navigate = useNavigate();
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

  const calculateWatts = (group: DealGroup): number => {
    return group.total_tasks * 10;
  };

  const goToPulse = () => {
    onClose();
    navigate('/?view=pulse');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">

      {/* Sticky Header */}
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

        {/* Filter Pills */}
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
              onClick={() => setFilter('mine')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                filter === 'mine'
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

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading threads...</p>
            </div>
          </div>
        ) : dealGroups.length === 0 ? (
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
            {dealGroups.map((group) => (
              <DealThread
                key={group.deal.id}
                group={group}
                userId={user?.id || ''}
                onComplete={completeTask}
                onPickup={pickupTask}
                buildTaskTree={buildTaskTree}
                calculateWatts={calculateWatts}
              />
            ))}
          </Accordion>
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
  calculateWatts: (group: DealGroup) => number;
}

function DealThread({ group, userId, onComplete, onPickup, buildTaskTree, calculateWatts }: DealThreadProps) {
  const taskTree = buildTaskTree(group.tasks);
  const wattsAvailable = calculateWatts(group);

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
    <AccordionItem value={group.deal.id} className="border-b border-slate-200 dark:border-slate-800">
      <AccordionTrigger className="hover:bg-slate-50 dark:hover:bg-slate-900/50 px-4 py-4 hover:no-underline">
        <div className="flex items-start gap-3 w-full">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
            {group.deal.account_name?.charAt(0) || 'D'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{group.deal.name}</h3>
              <Badge className={`text-xs px-2 py-0.5 font-semibold ${getStageColor(group.deal.stage)}`}>
                {group.deal.stage}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <span>{group.deal.account_name}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />
                +{wattsAvailable} MW
              </span>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <Progress
                value={group.progress}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800"
                indicatorClassName="bg-orange-500"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[36px]">
                {group.progress}%
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {group.completed_tasks}/{group.total_tasks} tasks complete
            </div>
          </div>

          {/* AI Suggest Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info('AI Suggest', { description: 'Coming soon: AI will suggest task chains' });
            }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-orange-500 dark:hover:text-orange-400"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Chevron (provided by AccordionTrigger) */}
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
  const isCompleted = task.status === 'Completed';
  const isMine = task.assignedToId === userId;
  const isUnassigned = !task.assignedToId;
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isCompleted;

  const indentClass = depth > 0 ? `pl-${depth * 6}` : '';
  const avatarSize = depth === 0 ? 'w-8 h-8' : depth === 1 ? 'w-7 h-7' : 'w-6 h-6';
  const textSize = depth === 0 ? 'text-sm' : 'text-xs';
  const fontWeight = depth === 0 ? 'font-bold' : 'font-semibold';

  return (
    <div className="relative">
      <div
        className={`flex items-start gap-3 py-3 border-l-2 transition-all ${indentClass} ${
          isUnassigned && !isCompleted
            ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-400 dark:border-yellow-700'
            : isCompleted
              ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60'
              : isMine
                ? 'border-orange-400 dark:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
        } ${depth > 0 ? 'ml-8' : ''}`}
      >
        {/* Status Icon + Avatar */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pl-3">
          <button
            onClick={() => !isCompleted && isMine && onComplete(task.id, task.summary)}
            disabled={isCompleted || !isMine}
            className={`${isMine && !isCompleted ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          >
            {!isCompleted ? (
              <Circle className={`w-4 h-4 ${isMine ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </button>

          {task.assigneeAvatar || task.assigneeName ? (
            <Avatar className={`${avatarSize} flex-shrink-0`}>
              <AvatarImage src={task.assigneeAvatar || undefined} />
              <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {task.assigneeName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`${avatarSize} rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0`}>
              <Circle className="w-3 h-3 text-slate-400 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${textSize} ${fontWeight} ${
            isCompleted
              ? 'line-through text-slate-400 dark:text-slate-500'
              : isUnassigned
                ? 'text-yellow-900 dark:text-yellow-200'
                : isMine
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300'
          }`}>
            {task.summary}
          </p>

          {task.details && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{task.details}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.assigneeName && (
              <span className="text-xs text-slate-500 dark:text-slate-400">@{task.assigneeName.split(' ')[0]}</span>
            )}

            {task.dueDate && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : isToday(parseISO(task.dueDate))
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-slate-500 dark:text-slate-400'
                }`}>
                  <Clock className="w-3 h-3" />
                  {format(parseISO(task.dueDate), 'MMM d')}
                </div>
              </>
            )}

            {task.priority && task.priority !== 'Low' && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className={`text-xs font-semibold ${
                  task.priority === 'High'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {task.priority}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 pr-3">
          {isUnassigned && !isCompleted && (
            <button
              onClick={() => onPickup(task.id, task.summary)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-full border border-yellow-300 dark:border-yellow-700 transition-all"
            >
              <Hand className="w-3 h-3" />
              Pickup +10
            </button>
          )}

          {isMine && !isCompleted && (
            <button
              onClick={() => onComplete(task.id, task.summary)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 rounded-full transition-all shadow-sm"
            >
              Complete
              <CheckCircle2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Render Children */}
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
