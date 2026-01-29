import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Zap, Target, Hand, User, Clock, Sparkles, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
      <div key={task.id} className="relative">
        <div className="flex gap-3">
          {depth > 0 && (
            <div className="relative flex flex-col items-center w-6 flex-shrink-0">
              <div className="absolute left-3 -top-3 h-6 w-0.5 bg-gray-300" />
              <div className="absolute left-3 top-3 h-full w-0.5 bg-gray-300" />
              <div className="absolute left-3 top-3 w-3 h-0.5 bg-gray-300" />
            </div>
          )}

          <div className="flex-1">
            <div
              className={`
                relative flex items-start gap-3 p-3 rounded-lg transition-all border
                ${needsPickup && !isCompleted ? 'bg-amber-50 border-amber-300 shadow-sm' : ''}
                ${isMine && !isCompleted ? 'bg-white border-blue-300 shadow-md font-semibold' : ''}
                ${!isMine && !needsPickup && !isCompleted ? 'bg-gray-50 border-gray-200' : ''}
                ${isCompleted ? 'bg-gray-100 border-gray-200 opacity-50' : ''}
                hover:shadow-lg
              `}
            >
              <button
                onClick={() => toggleTaskComplete(task.id, task.status, task.summary)}
                className="mt-0.5 flex-shrink-0 transition-transform active:scale-95"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 hover:text-orange-500" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className={`text-sm ${isMine && !isCompleted ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                  {task.summary}
                </h4>

                {task.details && (
                  <p className="text-xs text-gray-500 mt-1">{task.details}</p>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {needsPickup && !isCompleted && (
                    <button
                      onClick={() => pickupTask(task.id, task.summary)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-400 transition-all hover:scale-105 active:scale-95"
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
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={task.assigneeAvatar || undefined} />
                        <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                          {task.assigneeName?.charAt(0) || <User className="w-2.5 h-2.5" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-700">{task.assigneeName}</span>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      isOverdue ? 'bg-red-100 text-red-700' :
                      isToday(parseISO(task.dueDate)) ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatDueDate(task.dueDate)}
                    </div>
                  )}

                  {task.priority && task.priority !== 'Low' && (
                    <Badge variant={task.priority === 'High' ? 'destructive' : 'default'} className="text-[10px] px-2 py-0">
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>

              {isMine && !isCompleted && (
                <Badge className="bg-blue-500 text-white hover:bg-blue-600 text-[10px] px-2 py-0.5">
                  In Progress
                </Badge>
              )}
            </div>

            {task.children && task.children.length > 0 && (
              <div className="mt-2 space-y-2">
                {task.children.map(child => renderTask(child, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalTasks = dealGroups.reduce((sum, group) => sum + group.total_tasks, 0);
  const completedTasks = dealGroups.reduce((sum, group) => sum + group.completed_tasks, 0);

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Prospecting': 'bg-slate-100 text-slate-700 border-slate-300',
      'Qualification': 'bg-blue-100 text-blue-700 border-blue-300',
      'Proposal': 'bg-purple-100 text-purple-700 border-purple-300',
      'Negotiation': 'bg-orange-100 text-orange-700 border-orange-300',
      'Closing': 'bg-green-100 text-green-700 border-green-300',
      'Won': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Task Master</h2>
              <p className="text-sm text-gray-600">
                {completedTasks}/{totalTasks} complete across {dealGroups.length} {dealGroups.length === 1 ? 'deal' : 'deals'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-center">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'all', label: 'All Tasks' },
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
                <p className="text-gray-500 font-medium">Loading unified deal stream...</p>
              </div>
            </div>
          ) : dealGroups.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-500">No tasks found for this view.</p>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={dealGroups.map(g => g.deal.id)} className="space-y-4">
              {dealGroups.map((group) => {
                const taskTree = buildTaskTree(group.tasks);

                return (
                  <AccordionItem
                    key={group.deal.id}
                    value={group.deal.id}
                    className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <AccordionTrigger className="hover:no-underline px-5 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 [&[data-state=open]]:from-orange-600 [&[data-state=open]]:to-orange-700">
                      <div className="flex items-center justify-between flex-1 mr-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Target className="w-6 h-6 text-white flex-shrink-0" />
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-white text-lg">{group.deal.name}</h3>
                              <Badge className={`text-[10px] px-2 py-0.5 border ${getStageColor(group.deal.stage)}`}>
                                {group.deal.stage}
                              </Badge>
                            </div>
                            <p className="text-orange-100 text-xs font-medium">
                              {group.deal.account_name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('AI Suggest coming soon!', {
                                description: 'This will use Gemini to suggest next actions'
                              });
                            }}
                            className="text-white hover:bg-white/20 h-8 gap-1.5"
                          >
                            <Sparkles className="w-4 h-4" />
                            AI Suggest
                          </Button>
                        </div>

                        <div className="text-right min-w-[140px]">
                          <div className="flex items-center justify-end gap-2 mb-1.5">
                            <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                            <span className="text-sm font-bold text-white">
                              {group.progress}% to Jackpot
                            </span>
                          </div>
                          <div className="w-full bg-orange-300/40 rounded-full h-2.5 shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${group.progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-orange-100 mt-1">
                            {group.completed_tasks} of {group.total_tasks} tasks
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 py-4 bg-gradient-to-br from-gray-50 to-white">
                      {taskTree.length > 0 ? (
                        <div className="space-y-3">
                          {taskTree.map(task => renderTask(task))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 text-sm py-8">No tasks in this deal</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
