import { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Zap, Hand, Clock, Circle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      setDealGroups(data || []);
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Velocity Command</h2>
              <p className="text-sm text-gray-600">
                {dealGroups.reduce((sum, g) => sum + g.completed_tasks, 0)}/
                {dealGroups.reduce((sum, g) => sum + g.total_tasks, 0)} tasks complete
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-center bg-white">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'mine', label: 'Mine' },
              { value: 'delegated', label: 'Delegated' },
            ]}
            size="md"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
                <p className="text-gray-500 font-medium">Loading deal stream...</p>
              </div>
            </div>
          ) : dealGroups.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-500">No tasks for this view</p>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={dealGroups.map(g => g.deal.id)} className="space-y-4">
              {dealGroups.map((group) => (
                <DealAccordionItem
                  key={group.deal.id}
                  group={group}
                  userId={user?.id || ''}
                  onComplete={completeTask}
                  onPickup={pickupTask}
                  buildTaskTree={buildTaskTree}
                />
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}

interface DealAccordionItemProps {
  group: DealGroup;
  userId: string;
  onComplete: (taskId: string, summary: string) => void;
  onPickup: (taskId: string, summary: string) => void;
  buildTaskTree: (tasks: Task[]) => Task[];
}

function DealAccordionItem({ group, userId, onComplete, onPickup, buildTaskTree }: DealAccordionItemProps) {
  const taskTree = buildTaskTree(group.tasks);

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Prospecting': 'bg-slate-100 text-slate-700',
      'Qualification': 'bg-blue-100 text-blue-700',
      'Proposal': 'bg-purple-100 text-purple-700',
      'Negotiation': 'bg-orange-100 text-orange-700',
      'Closing': 'bg-green-100 text-green-700',
      'Won': 'bg-emerald-100 text-emerald-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AccordionItem
      value={group.deal.id}
      className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all"
    >
      <AccordionTrigger className="hover:no-underline px-5 py-4 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 [&[data-state=open]]:bg-slate-100">
        <div className="flex items-center justify-between flex-1 mr-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-3 flex-1">
              <h3 className="font-bold text-gray-900 text-lg">{group.deal.name}</h3>
              <Badge className={`text-xs px-2.5 py-0.5 ${getStageColor(group.deal.stage)}`}>
                {group.deal.stage}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toast.info('AI Suggest', {
                  description: 'Coming soon with Gemini integration'
                });
              }}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 h-8 gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">AI Suggest</span>
            </Button>
          </div>

          <div className="text-right min-w-[160px] ml-4">
            <div className="flex items-center justify-end gap-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-gray-900">
                {group.progress}% to Jackpot
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${group.progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">
              {group.completed_tasks} of {group.total_tasks} complete
            </p>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-5 py-4 bg-gray-50">
        {taskTree.length > 0 ? (
          <div className="space-y-2">
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
          <p className="text-center text-gray-500 text-sm py-8">No tasks in this deal</p>
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

  const getBackgroundStyle = () => {
    if (isCompleted) return 'bg-gray-100 border-gray-200 opacity-60';
    if (isUnassigned) return 'bg-amber-50 border-amber-200';
    if (isMine) return 'bg-white border-blue-300 shadow-sm';
    return 'bg-slate-50 border-slate-200';
  };

  return (
    <div className="relative">
      <div
        className={`border-l-2 pl-4`}
        style={{ marginLeft: `${depth * 16}px`, borderColor: depth > 0 ? '#cbd5e1' : 'transparent' }}
      >
        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getBackgroundStyle()}`}>
          {!isCompleted ? (
            <Circle className="w-5 h-5 mt-0.5 text-gray-300 hover:text-orange-500 cursor-pointer flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm ${isMine && !isCompleted ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${isCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.summary}
            </h4>

            {task.details && (
              <p className="text-xs text-gray-500 mt-1">{task.details}</p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {isUnassigned && !isCompleted && (
                <button
                  onClick={() => onPickup(task.id, task.summary)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-all hover:scale-105 active:scale-95"
                >
                  <Hand className="w-3.5 h-3.5" />
                  Pickup
                  <div className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-amber-200 rounded">
                    <Zap className="w-3 h-3 text-amber-700" />
                    <span className="text-[10px]">+5</span>
                  </div>
                </button>
              )}

              {task.assigneeName && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-md">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={task.assigneeAvatar || undefined} />
                    <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                      {task.assigneeName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-700">{task.assigneeName}</span>
                </div>
              )}

              {task.dueDate && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  isOverdue ? 'bg-red-100 text-red-700 border border-red-300' :
                  isToday(parseISO(task.dueDate)) ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                  'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  <Clock className="w-3 h-3" />
                  {format(parseISO(task.dueDate), 'MMM d')}
                </div>
              )}

              {task.priority && task.priority !== 'Low' && (
                <Badge
                  variant={task.priority === 'High' ? 'destructive' : 'default'}
                  className="text-[10px] px-2 py-0"
                >
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>

          {isMine && !isCompleted && (
            <button
              onClick={() => onComplete(task.id, task.summary)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1 flex-shrink-0"
            >
              Complete
              <Zap className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => toast.info('AI Suggest', { description: 'Coming soon' })}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0 opacity-40 cursor-not-allowed"
            disabled
          >
            <Sparkles className="w-4 h-4 text-gray-400" />
          </button>
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
