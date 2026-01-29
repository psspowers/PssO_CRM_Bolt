import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Zap, Target, Hand, User, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';

type ViewMode = 'all' | 'mine' | 'delegated';

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
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: viewMode,
      });

      if (error) throw error;

      setDealGroups(data || []);
    } catch (error) {
      console.error('Error fetching task threads:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [viewMode, user]);

  const toggleTaskComplete = async (taskId: string, currentStatus: string, taskSummary: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

    try {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ task_status: newStatus })
        .eq('id', taskId);

      if (updateError) throw updateError;

      if (newStatus === 'Completed' && user?.id) {
        const { error: wattsError } = await supabase
          .from('watts_ledger')
          .insert({
            user_id: user.id,
            amount: 10,
            type: 'complete_task',
            description: `Completed task: ${taskSummary}`,
            related_entity_id: taskId,
            related_entity_type: 'Activity'
          });

        if (wattsError) console.error('Watts error:', wattsError);

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f97316', '#fb923c', '#fdba74']
        });

        toast.success('+10 Watts Earned!', {
          description: 'Great work completing that task',
          duration: 3000
        });
      } else {
        toast.success('Task reopened');
      }

      fetchThreads();
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
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

      if (wattsError) console.error('Watts error:', wattsError);

      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fde047']
      });

      toast.success('+5 Watts Earned!', {
        description: 'Thanks for taking the initiative',
        duration: 3000
      });

      fetchThreads();
    } catch (error) {
      console.error('Error picking up task:', error);
      toast.error('Failed to pickup task');
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;

    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isPast(date)) return `Overdue (${format(date, 'MMM d')})`;
      return format(date, 'MMM d');
    } catch {
      return null;
    }
  };

  const getDueDateColor = (dateStr: string | null) => {
    if (!dateStr) return 'text-gray-500';

    try {
      const date = parseISO(dateStr);
      if (isPast(date) && !isToday(date)) return 'text-red-600';
      if (isToday(date)) return 'text-orange-600';
      if (isTomorrow(date)) return 'text-blue-600';
      return 'text-gray-600';
    } catch {
      return 'text-gray-500';
    }
  };

  const isMyTask = (task: Task) => task.assignedToId === user?.id;
  const isUnassigned = (task: Task) => !task.assignedToId;

  const buildTaskTree = (tasks: Task[]): Task[] => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    const roots: (Task & { children: Task[] })[] = [];

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

  const renderTask = (task: Task & { children?: Task[] }, depth: number = 0) => {
    const isCompleted = task.status === 'Completed';
    const isMine = isMyTask(task);
    const needsPickup = isUnassigned(task);
    const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isCompleted;

    return (
      <div key={task.id} className="space-y-2">
        <div
          className={`
            relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all
            ${needsPickup ? 'bg-amber-50 border-amber-400' : 'bg-white border-gray-200'}
            ${isMine && !isCompleted ? 'ring-2 ring-blue-200' : ''}
            ${isCompleted ? 'opacity-60' : ''}
            hover:shadow-md
          `}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <button
            onClick={() => toggleTaskComplete(task.id, task.status, task.summary)}
            className="mt-0.5 flex-shrink-0 transition-transform active:scale-95"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 hover:text-orange-500" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm ${isMine && !isCompleted ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${isCompleted ? 'line-through' : ''}`}>
              {task.summary}
            </h4>

            {task.details && (
              <p className="text-xs text-gray-500 mt-1">{task.details}</p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {needsPickup && !isCompleted && (
                <button
                  onClick={() => pickupTask(task.id, task.summary)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md border border-amber-300 transition-colors"
                >
                  <Hand className="w-3 h-3" />
                  Pickup
                  <Zap className="w-3 h-3 text-amber-500" />
                  +5
                </button>
              )}

              {task.assigneeName && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={task.assigneeAvatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                      {task.assigneeName?.charAt(0) || <User className="w-3 h-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600">{task.assigneeName}</span>
                </div>
              )}

              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs font-medium ${getDueDateColor(task.dueDate)}`}>
                  <Clock className="w-3 h-3" />
                  {formatDueDate(task.dueDate)}
                  {isOverdue && <span className="text-red-600 font-bold">!</span>}
                </div>
              )}

              {task.priority && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  task.priority === 'High' ? 'bg-red-100 text-red-700' :
                  task.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority}
                </span>
              )}

              {depth > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                  L{depth + 1}
                </span>
              )}
            </div>
          </div>

          {isMine && !isCompleted && (
            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full self-start">
              MINE
            </div>
          )}
        </div>

        {task.children && task.children.length > 0 && (
          <div className="space-y-2">
            {task.children.map(child => renderTask(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalTasks = dealGroups.reduce((sum, group) => sum + group.total_tasks, 0);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Velocity Command</h2>
              <p className="text-sm text-gray-500">
                {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across {dealGroups.length} {dealGroups.length === 1 ? 'deal' : 'deals'}
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

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex gap-2 p-1 bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                viewMode === 'all' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode('mine')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                viewMode === 'mine' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setViewMode('delegated')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                viewMode === 'delegated' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Delegated
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
                <p className="text-gray-500">Loading velocity stream...</p>
              </div>
            </div>
          ) : dealGroups.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-500">No tasks found for this view.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {dealGroups.map((group) => {
                const taskTree = buildTaskTree(group.tasks);

                return (
                  <div
                    key={group.deal.id}
                    className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Target className="w-5 h-5 text-white" />
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-lg">{group.deal.name}</h3>
                            <p className="text-orange-100 text-xs">
                              {group.deal.account_name} • {group.deal.stage}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-orange-100">
                            {group.completed_tasks}/{group.total_tasks} Complete
                          </div>
                          <div className="w-32 mt-1 bg-orange-400/30 rounded-full h-2">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-500"
                              style={{ width: `${group.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {taskTree.length > 0 ? (
                        taskTree.map(task => renderTask(task))
                      ) : (
                        <p className="text-center text-gray-500 text-sm py-4">No tasks in this deal</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
