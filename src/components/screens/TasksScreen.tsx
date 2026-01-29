import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Clock, Loader2, User, Target, ChevronDown, ChevronRight, Hand, Zap, Users, Search, X, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

interface TaskThread {
  id: string;
  summary: string;
  details?: string;
  status?: 'Pending' | 'Completed';
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
  tasks: TaskThread[];
}

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTaskThreads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user?.id || null,
        p_filter: filter
      });

      if (error) throw error;
      setDealGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching task threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task threads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskThreads();
  }, [filter, user?.id]);

  const toggleTask = async (taskId: string, currentStatus?: string) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      const { error } = await supabase
        .from('activities')
        .update({ task_status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: newStatus === 'Completed' ? 'Task Completed' : 'Task Reopened',
        description: newStatus === 'Completed' ? 'Great work!' : 'Task marked as pending'
      });

      fetchTaskThreads();
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
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

      if (wattsError) throw wattsError;

      toast({
        title: 'Task Picked Up!',
        description: '+5 Watts earned for taking initiative',
        className: 'bg-green-50 border-green-200'
      });

      fetchTaskThreads();
    } catch (error: any) {
      console.error('Error picking up task:', error);
      toast({
        title: 'Error',
        description: 'Failed to pickup task',
        variant: 'destructive'
      });
    }
  };

  const buildTaskTree = (tasks: TaskThread[]): TaskThread[] => {
    const taskMap = new Map<string, TaskThread & { children: TaskThread[] }>();
    const roots: (TaskThread & { children: TaskThread[] })[] = [];

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

  const renderTask = (task: TaskThread & { children?: TaskThread[] }, depth: number = 0) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
    const isCompleted = task.status === 'Completed';
    const isUnassigned = !task.assignedToId;
    const indentClass = depth > 0 ? `ml-${depth * 6}` : '';

    return (
      <div key={task.id} className="space-y-2">
        <div
          className={`p-3 bg-white border rounded-lg shadow-sm flex gap-3 items-start ${isCompleted ? 'opacity-60' : ''} ${indentClass}`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <button onClick={() => toggleTask(task.id, task.status)} className="mt-0.5 flex-shrink-0">
            {isCompleted ?
              <CheckSquare className="w-5 h-5 text-green-500" /> :
              <Square className="w-5 h-5 text-gray-300" />
            }
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.summary}
            </h4>
            {task.details && (
              <p className="text-xs text-gray-500 mt-1">{task.details}</p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}

              {!isUnassigned ? (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <User className="w-3 h-3" />
                  {task.assigneeName || 'Unknown'}
                </div>
              ) : (
                <button
                  onClick={() => pickupTask(task.id, task.summary)}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors border border-amber-200"
                >
                  <Hand className="w-3 h-3" />
                  Pickup?
                  <Zap className="w-3 h-3 text-amber-500" />
                </button>
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
        </div>

        {task.children && task.children.length > 0 && (
          <div className="space-y-2">
            {task.children.map(child => renderTask(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header Section */}
      <div className="space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('mine')}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold transition-all flex-1 justify-center ${
              filter === 'mine'
                ? 'bg-white shadow-sm text-orange-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Tasks</span>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold transition-all flex-1 justify-center ${
              filter === 'all'
                ? 'bg-white shadow-sm text-orange-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Tasks</span>
          </button>
        </div>
      </div>

      {dealGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No tasks found</p>
          <p className="text-xs mt-1">Create tasks from the Deals screen</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {dealGroups.map((group, idx) => {
            const taskTree = buildTaskTree(group.tasks);

            return (
              <AccordionItem
                key={group.deal.id}
                value={group.deal.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3 text-left">
                      <Target className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.deal.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.deal.account_name} • {group.deal.stage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-600">
                          {group.completed_tasks}/{group.total_tasks} Complete
                        </div>
                        <div className="w-24 mt-1">
                          <Progress
                            value={group.progress}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {taskTree.map(task => renderTask(task))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
