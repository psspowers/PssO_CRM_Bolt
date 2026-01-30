import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, Search, X, Plus, Calendar, Check, ChevronRight, CornerDownRight, Eye, EyeOff, User } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskThread {
  id: string;
  summary: string;
  details?: string;
  task_status?: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  due_date?: string;
  assigned_to_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  parent_task_id?: string;
  depth: number;
  created_at: string;
  children?: TaskThread[];
  isOptimistic?: boolean;
}

interface DealGroup {
  id: string;
  name: string;
  stage: string;
  mw: number;
  velocity_score: number;
  tasks: TaskThread[] | null;
}

const getStageAvatar = (stage: string) => {
  const configs: Record<string, { char: string; color: string; bg: string }> = {
    'Prospect': { char: '•', color: 'text-slate-400', bg: 'bg-slate-100' },
    'Qualified': { char: 'Q', color: 'text-blue-600', bg: 'bg-blue-100' },
    'Proposal': { char: 'P', color: 'text-amber-600', bg: 'bg-amber-100' },
    'Negotiation': { char: 'N', color: 'text-orange-600', bg: 'bg-orange-100' },
    'Term Sheet': { char: 'T', color: 'text-teal-600', bg: 'bg-teal-100' },
    'Won': { char: 'W', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  };
  const s = configs[stage] || { char: '?', color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white z-20 relative', s.bg, s.color)}>
      {s.char}
    </div>
  );
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const buildTaskTree = (tasks: TaskThread[]): TaskThread[] => {
  if (!tasks) return [];
  const taskMap = new Map<string, TaskThread>();
  const roots: TaskThread[] = [];

  const tasksCopy = tasks.map(t => ({ ...t, children: [] }));

  tasksCopy.forEach(task => taskMap.set(task.id, task));

  tasksCopy.forEach(task => {
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      taskMap.get(task.parent_task_id)!.children!.push(task);
    } else {
      roots.push(task);
    }
  });

  return roots;
};

const InlineTaskEditor = ({
  users,
  currentUser,
  onSave,
  onCancel,
}: {
  users: any[];
  currentUser: any;
  onSave: (summary: string, assignee: string, date: string) => void;
  onCancel: () => void;
}) => {
  const [summary, setSummary] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start py-1"
    >
      <div className="flex-1 flex items-start gap-2">
        <div className="flex-1 space-y-2 bg-white border border-orange-200 rounded-lg p-2 shadow-sm">
          <input
            ref={inputRef}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && summary.trim()) onSave(summary, assigneeId, dueDate);
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Type task..."
            className="w-full bg-transparent border-b border-orange-100 focus:border-orange-500 outline-none text-sm font-medium py-1 placeholder:text-slate-300"
          />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-0.5">
              <User className="w-3 h-3 text-slate-400" />
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="bg-transparent text-[10px] outline-none text-slate-600 w-20 truncate"
              >
                <option value={currentUser?.id}>Me</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-transparent text-[10px] outline-none text-slate-600 w-24"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => summary.trim() && onSave(summary, assigneeId, dueDate)}
                disabled={!summary.trim()}
                className="p-1 hover:bg-green-50 rounded text-green-600 disabled:opacity-30"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TaskNode = ({
  task,
  dealId,
  depth,
  onComplete,
  onPickup,
  onReply,
  currentUserId,
  users,
  replyingToId,
  onSaveTask,
  onCancelTask,
  hideCompleted,
}: {
  task: TaskThread;
  dealId: string;
  depth: number;
  onComplete: (id: string, currentStatus?: string) => void;
  onPickup: (id: string) => void;
  onReply: (id: string) => void;
  currentUserId?: string;
  users: any[];
  replyingToId: string | null;
  onSaveTask: (summary: string, assignee: string, date: string, parentId: string) => void;
  onCancelTask: () => void;
  hideCompleted: boolean;
}) => {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const hasChildren = task.children && task.children.length > 0;
  const isReplyingHere = replyingToId === task.id;

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted;

  const avatarSize = depth === 0 ? 'w-7 h-7' : 'w-6 h-6';

  if (task.isOptimistic) {
    return (
      <div className="py-1 pl-4 opacity-50 animate-pulse text-xs text-slate-400 flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
      </div>
    );
  }

  if (hideCompleted && isCompleted) return null;

  const visibleChildren = hideCompleted
    ? (task.children || []).filter(c => c.task_status !== 'Completed')
    : (task.children || []);

  return (
    <>
      <div className={cn(
        "relative flex items-start gap-3 py-1 pr-2 group transition-colors rounded-lg",
        isCompleted ? 'opacity-50 grayscale' : 'hover:bg-slate-50'
      )}>
        <div className="flex-1 flex items-start gap-3 min-w-0">
          {isUnassigned ? (
            <button
              onClick={() => onPickup(task.id)}
              className={cn(
                avatarSize,
                "rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-white"
              )}
            >
              <Hand className="w-3 h-3 text-amber-600" />
            </button>
          ) : (
            <Avatar className={cn(avatarSize, "ring-2 ring-white shadow-sm flex-shrink-0")}>
              <AvatarImage src={task.assignee_avatar} />
              <AvatarFallback className="bg-slate-100 text-[9px] text-slate-600">
                {getInitials(task.assignee_name)}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={cn(
                  "text-sm leading-snug transition-all",
                  isMine ? "font-bold text-slate-900" : "font-medium text-slate-600",
                  isCompleted && "line-through decoration-slate-300"
                )}>
                  {task.summary}
                </p>
                {task.details && (
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{task.details}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {task.due_date && (
                  <span className={cn(
                    "text-[10px] whitespace-nowrap font-medium",
                    isOverdue ? "text-red-500" : "text-slate-400"
                  )}>
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onReply(task.id); }}
                  className="text-slate-300 hover:text-orange-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Reply"
                >
                  <CornerDownRight className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete(task.id, task.task_status); }}
                  className="text-slate-300 hover:text-green-500 transition-colors"
                >
                  {isCompleted ? (
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(hasChildren || isReplyingHere) && (
        <div className="ml-7 border-l-2 border-dotted border-gray-300 pl-4">
          {visibleChildren.map((child: TaskThread) => (
            <TaskNode
              key={child.id}
              task={child}
              dealId={dealId}
              depth={depth + 1}
              onComplete={onComplete}
              onPickup={onPickup}
              onReply={onReply}
              currentUserId={currentUserId}
              users={users}
              replyingToId={replyingToId}
              onSaveTask={onSaveTask}
              onCancelTask={onCancelTask}
              hideCompleted={hideCompleted}
            />
          ))}

          {isReplyingHere && (
            <InlineTaskEditor
              users={users}
              currentUser={users.find((u: any) => u.id === currentUserId)}
              onSave={(s, a, d) => onSaveTask(s, a, d, task.id)}
              onCancel={onCancelTask}
            />
          )}
        </div>
      )}
    </>
  );
};

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const { users } = useAppContext();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [addingRootToDealId, setAddingRootToDealId] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_deal_threads_view', { p_view_mode: 'all' });
      if (error) throw error;
      setDealGroups(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: 'is_task=eq.true' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleToggleDeal = (id: string) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleComplete = async (id: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    await supabase.from('activities').update({ task_status: newStatus }).eq('id', id);
    fetchTasks();
    if (newStatus === 'Completed') {
      toast({ title: 'Task Completed (+10⚡)', className: 'bg-green-50 border-green-200' });
    }
  };

  const handlePickup = async (id: string) => {
    await supabase.from('activities').update({ assigned_to_id: user?.id }).eq('id', id);
    fetchTasks();
    toast({ title: 'Task Picked Up (+5⚡)', className: 'bg-orange-50 border-orange-200' });
  };

  const handleSaveNewTask = async (summary: string, assignee: string, date: string, parentId?: string) => {
    try {
      let targetDealId = '';

      if (addingRootToDealId) {
        targetDealId = addingRootToDealId;
      } else if (parentId) {
        for (const group of dealGroups) {
          const findInTree = (tasks: TaskThread[]): boolean => {
            return tasks.some(t => t.id === parentId || (t.children && findInTree(t.children)));
          };
          if (findInTree(group.tasks || [])) {
            targetDealId = group.id;
            break;
          }
        }
      }

      const payload: any = {
        summary,
        is_task: true,
        task_status: 'Pending',
        created_by: user?.id,
        assigned_to_id: assignee,
        root_deal_id: targetDealId,
        related_to_id: targetDealId,
        related_to_type: 'Opportunity'
      };

      if (parentId) payload.parent_task_id = parentId;
      if (date) payload.due_date = new Date(date).toISOString();

      const { error } = await supabase.from('activities').insert(payload);
      if (error) throw error;

      toast({ title: 'Task Created (+5⚡)', className: 'bg-orange-50 border-orange-200' });
      setReplyingToId(null);
      setAddingRootToDealId(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const displayGroups = useMemo(() => {
    return dealGroups.map(group => {
      let tasks = group.tasks || [];
      if (search) {
        const filterTree = (tasks: TaskThread[]): TaskThread[] => {
          return tasks.filter(t => {
            const matchesSummary = t.summary.toLowerCase().includes(search.toLowerCase());
            const childrenMatch = t.children ? filterTree(t.children) : [];
            if (matchesSummary || childrenMatch.length > 0) {
              return true;
            }
            return false;
          }).map(t => ({
            ...t,
            children: t.children ? filterTree(t.children) : []
          }));
        };
        tasks = filterTree(tasks);
      }
      return { ...group, tasks };
    }).filter(g => {
      const hasTasks = g.tasks.length > 0;
      const matchesName = g.name.toLowerCase().includes(search.toLowerCase());
      return hasTasks || matchesName;
    });
  }, [dealGroups, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-[50] bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              hideCompleted ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideCompleted ? 'Hidden' : 'Show All'}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-slate-50 border-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {displayGroups.map(group => {
          const isExpanded = expandedDeals.has(group.id);
          const taskTree = buildTaskTree(group.tasks || []);
          const isAddingRoot = addingRootToDealId === group.id;

          return (
            <div key={group.id} className="relative px-4">
              <div
                onClick={() => handleToggleDeal(group.id)}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg px-2"
              >
                <ChevronRight
                  className={cn(
                    "w-5 h-5 text-slate-400 transition-transform flex-shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
                {getStageAvatar(group.stage)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">{group.name}</span>
                    {group.mw > 0 && (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        {group.mw} MW
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-9 border-l-2 border-dotted border-gray-300 pl-4 mt-1"
                  >
                    {taskTree.map((task) => (
                      <TaskNode
                        key={task.id}
                        task={task}
                        dealId={group.id}
                        depth={0}
                        onComplete={handleComplete}
                        onPickup={handlePickup}
                        onReply={(id) => setReplyingToId(id)}
                        currentUserId={user?.id}
                        users={users}
                        replyingToId={replyingToId}
                        onSaveTask={handleSaveNewTask}
                        onCancelTask={() => setReplyingToId(null)}
                        hideCompleted={hideCompleted}
                      />
                    ))}

                    {isAddingRoot && (
                      <InlineTaskEditor
                        users={users}
                        currentUser={users.find(u => u.id === user?.id)}
                        onSave={(s, a, d) => handleSaveNewTask(s, a, d)}
                        onCancel={() => setAddingRootToDealId(null)}
                      />
                    )}

                    {!isAddingRoot && (
                      <div className="relative h-8 w-full flex items-center py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingRootToDealId(group.id);
                          }}
                          className="w-7 h-7 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center text-orange-600 hover:scale-110 transition-transform shadow-sm"
                          title="Add Task to Deal"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {displayGroups.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksScreen;
