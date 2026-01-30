import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Loader2, Square, CheckSquare, Clock, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isPast } from 'date-fns';

interface Task {
  id: string;
  summary: string;
  status: 'Pending' | 'Completed';
  dueDate?: string;
  assignedToId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  parentTaskId?: string;
  children?: Task[];
}

interface DealGroup {
  deal: {
    id: string;
    name: string;
    stage: string;
    value: number;
  };
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: Task[];
}

const getStageConfig = (stage: string) => {
  const configs: Record<string, { char: string; color: string }> = {
    'Prospect': { char: '', color: 'bg-slate-400' },
    'Qualified': { char: 'Q', color: 'bg-blue-500' },
    'Proposal': { char: 'P', color: 'bg-amber-500' },
    'Negotiation': { char: 'N', color: 'bg-purple-500' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500' },
    'Won': { char: 'W', color: 'bg-green-500' }
  };
  return configs[stage] || { char: '', color: 'bg-slate-400' };
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingToTaskId, setAddingToTaskId] = useState<string | null>(null);
  const [addingToDealId, setAddingToDealId] = useState<string | null>(null);
  const [newTaskSummary, setNewTaskSummary] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchTaskThreads();
    }
  }, [user?.id]);

  const fetchTaskThreads = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_task_threads', {
        p_user_id: user.id,
        p_filter: 'mine'
      });

      if (error) throw error;
      setDealGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching task threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDeal = (dealId: string) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

    try {
      const { error } = await supabase
        .from('activities')
        .update({ task_status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      fetchTaskThreads();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  const handleSaveSubtask = async (parentTaskId: string) => {
    if (!newTaskSummary.trim() || !addingToDealId) return;

    try {
      const { error } = await supabase.from('activities').insert({
        type: 'Task',
        summary: newTaskSummary.trim(),
        task_status: 'Pending',
        related_to_id: addingToDealId,
        related_to_type: 'opportunity',
        assigned_to_id: user?.id,
        parent_task_id: parentTaskId,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: 'Subtask Added',
        description: 'New subtask created successfully',
        className: 'bg-green-50 border-green-200'
      });

      setAddingToTaskId(null);
      setAddingToDealId(null);
      setNewTaskSummary('');
      fetchTaskThreads();
      setExpandedTasks(prev => new Set(prev).add(parentTaskId));
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      toast({
        title: 'Error',
        description: 'Failed to add subtask',
        variant: 'destructive'
      });
    }
  };

  const DealThreadItem: React.FC<{ group: DealGroup }> = ({ group }) => {
    const isExpanded = expandedDeals.has(group.deal.id);
    const stageConfig = getStageConfig(group.deal.stage);

    return (
      <div className="relative border-b border-slate-100">
        <div className="py-4 px-4 flex items-center gap-4">
          <button
            onClick={() => toggleDeal(group.deal.id)}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-700" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-700" />
            )}
          </button>

          <div className={`w-12 h-12 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
            {stageConfig.char || group.deal.name[0]}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {group.deal.name}
            </h3>
            <p className="text-sm text-slate-500">
              {group.deal.value?.toLocaleString()} MW
            </p>
          </div>

          <div className="text-sm text-slate-600 flex-shrink-0">
            {group.completed_tasks}/{group.total_tasks}
          </div>
        </div>

        {isExpanded && group.tasks.length > 0 && (
          <div className="relative">
            {renderTaskList(group.tasks, group.deal.id, 0)}
          </div>
        )}
      </div>
    );
  };

  const renderTaskList = (tasks: Task[], dealId: string, depth: number) => {
    return tasks.map((task, index) => {
      const isLast = index === tasks.length - 1;
      return (
        <TaskRow
          key={task.id}
          task={task}
          dealId={dealId}
          depth={depth}
          isLast={isLast}
        />
      );
    });
  };

  const TaskRow: React.FC<{ task: Task; dealId: string; depth: number; isLast: boolean }> = ({
    task,
    dealId,
    depth,
    isLast
  }) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isCompleted = task.status === 'Completed';
    const isMine = task.assignedToId === user?.id;
    const spineX = depth * 32;

    const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isCompleted;

    return (
      <>
        <div
          className="relative py-2 pr-4 overflow-visible"
          style={{ '--spine-x': `${spineX}px` } as React.CSSProperties}
        >
          {depth > 0 && (
            <>
              <div
                className="tree-spine"
                style={{
                  bottom: isLast && !isExpanded ? '50%' : '-12px'
                }}
              />
              <div className="tree-elbow" />
            </>
          )}

          {hasChildren && (
            <div
              className="junction-dot"
              onClick={() => toggleTask(task.id)}
            />
          )}

          <div
            className="red-plus-btn"
            onClick={() => {
              setAddingToTaskId(task.id);
              setAddingToDealId(dealId);
              setNewTaskSummary('');
              setExpandedTasks(prev => new Set(prev).add(task.id));
            }}
          >
            +
          </div>

          <div
            className="flex items-center gap-3 relative z-10"
            style={{ paddingLeft: `${depth * 32 + 24}px` }}
          >
            <Avatar className="w-8 h-8 ring-4 ring-white flex-shrink-0 relative z-10">
              <AvatarImage src={task.assigneeAvatar} />
              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                {task.assigneeName ? getInitials(task.assigneeName) : '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p
                className={`text-[14px] ${
                  isCompleted
                    ? 'line-through text-slate-400'
                    : isMine
                    ? 'font-medium text-slate-900 bg-yellow-50 px-1 -ml-1'
                    : 'text-slate-900'
                }`}
              >
                {task.summary}
              </p>
            </div>

            {task.dueDate && (
              <div className={`flex items-center gap-1 text-[11px] flex-shrink-0 ${
                isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'
              }`}>
                <Clock className="w-3 h-3" />
                <span>
                  {format(parseISO(task.dueDate), 'MMM d')}
                </span>
              </div>
            )}

            <button
              onClick={() => toggleTaskStatus(task.id, task.status)}
              className="flex-shrink-0"
            >
              {isCompleted ? (
                <CheckSquare className="w-5 h-5 text-green-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-300 hover:text-slate-500 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {addingToTaskId === task.id && (
          <div
            className="relative py-2 pr-4 bg-orange-50/30"
            style={{ paddingLeft: `${(depth + 1) * 32 + 24}px` }}
          >
            <div
              className="tree-spine"
              style={{
                left: `${(depth + 1) * 32}px`,
                top: '-12px',
                bottom: '50%'
              }}
            />
            <div
              className="tree-elbow"
              style={{ left: `${(depth + 1) * 32}px` }}
            />

            <input
              autoFocus
              type="text"
              placeholder="Type subtask and hit Enter..."
              className="w-full bg-transparent border-b-2 border-orange-200 focus:border-orange-500 outline-none text-sm py-1 px-2 text-slate-900 placeholder-slate-400"
              value={newTaskSummary}
              onChange={(e) => setNewTaskSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskSummary.trim()) {
                  handleSaveSubtask(task.id);
                }
                if (e.key === 'Escape') {
                  setAddingToTaskId(null);
                  setAddingToDealId(null);
                  setNewTaskSummary('');
                }
              }}
            />
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="relative">
            {renderTaskList(task.children!, dealId, depth + 1)}
          </div>
        )}
      </>
    );
  };

  const filteredDealGroups = dealGroups.filter(group => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      group.deal.name.toLowerCase().includes(searchLower) ||
      group.tasks.some(task => task.summary.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="task-tree-container h-full flex flex-col pb-24">
      <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals or tasks..."
            className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredDealGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No tasks found</p>
          </div>
        ) : (
          filteredDealGroups.map(group => (
            <DealThreadItem key={group.deal.id} group={group} />
          ))
        )}
      </div>
    </div>
  );
};
