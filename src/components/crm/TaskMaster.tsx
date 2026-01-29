import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Clock, AlertCircle, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

type ViewMode = 'my' | 'delegated' | 'all';
type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

interface Task {
  id: string;
  summary: string;
  task_status: TaskStatus;
  due_date: string | null;
  assigned_to_id: string;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  parent_task_id: string | null;
  thread_depth: number;
  created_at: string;
}

interface DealThread {
  id: string;
  name: string;
  stage: string;
  value: number | null;
  probability: number | null;
  tasks: Task[];
}

interface TaskMasterProps {
  onClose: () => void;
}

export function TaskMaster({ onClose }: TaskMasterProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('my');
  const [threads, setThreads] = useState<DealThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_deal_threads_view', {
        p_view_mode: viewMode,
      });

      if (error) throw error;

      setThreads(data || []);
    } catch (error) {
      console.error('Error fetching deal threads:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [viewMode, user]);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ task_status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task updated');
      fetchThreads();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      default:
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;

    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isPast(date)) return `Overdue (${format(date, 'MMM d')})`;
      return format(date, 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  const getDueDateColor = (dateStr: string | null) => {
    if (!dateStr) return 'text-gray-500';

    try {
      const date = parseISO(dateStr);
      if (isPast(date) && !isToday(date)) return 'text-red-600 font-semibold';
      if (isToday(date)) return 'text-orange-600 font-semibold';
      if (isTomorrow(date)) return 'text-blue-600';
      return 'text-gray-600';
    } catch {
      return 'text-gray-500';
    }
  };

  const cycleTaskStatus = (currentStatus: TaskStatus): TaskStatus => {
    const cycle: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Pending'];
    const currentIndex = cycle.indexOf(currentStatus);
    return cycle[currentIndex + 1];
  };

  const totalTasks = threads.reduce((sum, deal) => sum + (deal.tasks?.length || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Master</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across {threads.length} {threads.length === 1 ? 'deal' : 'deals'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'my' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('my')}
              className="rounded-full"
            >
              My Tasks
            </Button>
            <Button
              variant={viewMode === 'delegated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('delegated')}
              className="rounded-full"
            >
              Delegated
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
              className="rounded-full"
            >
              All Tasks
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
                <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
              </div>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  All Clear!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No tasks found for this view.
                </p>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {threads.map((deal) => (
                <AccordionItem
                  key={deal.id}
                  value={deal.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {deal.name}
                        </span>
                        <Badge variant="secondary" className="rounded-full">
                          {deal.tasks?.length || 0}
                        </Badge>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-medium"
                      >
                        {deal.stage}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-2 mt-2">
                      {deal.tasks?.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                          style={{ marginLeft: `${(task.thread_depth - 1) * 20}px` }}
                        >
                          {/* Status Pill (Clickable) */}
                          <button
                            onClick={() => updateTaskStatus(task.id, cycleTaskStatus(task.task_status))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${getStatusColor(
                              task.task_status
                            )}`}
                          >
                            {getStatusIcon(task.task_status)}
                            <span className="hidden sm:inline">{task.task_status}</span>
                          </button>

                          {/* Task Summary */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {task.summary}
                            </p>
                          </div>

                          {/* Assignee Avatar */}
                          {task.assigned_to_name && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={task.assigned_to_avatar || undefined} />
                                <AvatarFallback className="text-xs">
                                  {task.assigned_to_name?.charAt(0) || <User className="w-3 h-3" />}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <div className={`flex items-center gap-1.5 text-xs ${getDueDateColor(task.due_date)}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{formatDueDate(task.due_date)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
