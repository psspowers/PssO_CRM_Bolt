import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, Search, Plus, Calendar, Check, X, User, ChevronRight, Reply } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
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
    'Prospect': { char: 'P', color: 'text-slate-500', bg: 'bg-slate-100' },
    'Qualified': { char: 'Q', color: 'text-blue-600', bg: 'bg-blue-100' },
    'Proposal': { char: 'P', color: 'text-amber-600', bg: 'bg-amber-100' },
    'Negotiation': { char: 'N', color: 'text-orange-600', bg: 'bg-orange-100' },
    'Term Sheet': { char: 'T', color: 'text-teal-600', bg: 'bg-teal-100' },
    'Won': { char: 'W', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  };
  const s = configs[stage] || { char: '?', color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white', s.bg, s.color)}>
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
  if (!tasks || tasks.length === 0) return [];
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
  depth = 0,
  isReply = false,
}: {
  users: any[];
  currentUser: any;
  onSave: (summary: string, assignee: string, date: string) => void;
  onCancel: () => void;
  depth?: number;
  isReply?: boolean;
}) => {
  const [summary, setSummary] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (summary.trim()) {
      onSave(summary, assigneeId, dueDate);
      setSummary('');
      setAssigneeId(currentUser?.id || '');
      setDueDate('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="py-1"
    >
      <div className="flex items-start gap-2 pl-1">
        <div className="flex-1 bg-white border border-orange-200 rounded-lg shadow-sm">
          <input
            ref={inputRef}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder={isReply ? "Type reply..." : "Type task..."}
            className="w-full bg-transparent border-b border-orange-100 focus:border-orange-500 outline-none text-sm font-medium py-2 px-2 placeholder:text-slate-300"
          />

          {!isReply && (
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  className="appearance-none bg-transparent outline-none cursor-pointer opacity-0 absolute inset-0 w-6 h-6"
                  title="Assign to user"
                >
                  <option value={currentUser?.id}>Me</option>
                  {users.filter(u => u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <User className="w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-[11px] outline-none text-slate-600 cursor-pointer ml-auto"
                placeholder="mm/dd/yyyy"
              />

              <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSave} className="p-1 hover:bg-green-50 rounded text-green-600">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isReply && (
            <div className="flex items-center gap-1 px-2 py-2 justify-end">
              <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSave} className="p-1 hover:bg-green-50 rounded text-green-600">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
  onAddChild,
  onAddReply,
  currentUserId,
  users,
  addingChildTo,
  addingReplyTo,
  onSaveTask,
  onCancelTask,
  expandedTasks,
  onToggleExpand,
}: {
  task: TaskThread;
  dealId: string;
  depth: number;
  onComplete: (id: string, status?: string) => void;
  onPickup: (id: string) => void;
  onAddChild: (taskId: string) => void;
  onAddReply: (taskId: string) => void;
  currentUserId?: string;
  users: any[];
  addingChildTo: string | null;
  addingReplyTo: string | null;
  onSaveTask: (summary: string, assignee: string, date: string, parentId?: string, isReply?: boolean) => void;
  onCancelTask: () => void;
  expandedTasks: Set<string>;
  onToggleExpand: (id: string) => void;
}) => {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expandedTasks.has(task.id);
  const isAddingChild = addingChildTo === task.id;
  const isAddingReply = addingReplyTo === task.id;

  const avatarSize = depth === 0 ? 'w-7 h-7' : 'w-6 h-6';

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;

  if (task.isOptimistic) {
    return (
      <div className="py-1 flex items-center gap-2 opacity-50 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
        <span className="text-xs text-slate-400">Saving...</span>
      </div>
    );
  }

  const currentUser = users.find(u => u.id === currentUserId);

  return (
    <div className="relative">
      <div className={cn(
        'flex items-start gap-2 py-1 group transition-all',
        isCompleted && 'opacity-50 grayscale'
      )}>
        {/* Expand/Collapse */}
        <div className="w-4 flex justify-center items-start pt-1.5 flex-shrink-0">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(task.id)}
              className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded transition-colors"
            >
              <ChevronRight className={cn("w-3 h-3 text-slate-500 transition-transform", isExpanded && "rotate-90")} />
            </button>
          ) : null}
        </div>

        {/* Avatar or Pickup Button */}
        <div className="flex-shrink-0 mt-0.5">
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
            <Avatar className={cn(avatarSize, "ring-2 ring-white shadow-sm")}>
              <AvatarImage src={task.assignee_avatar} />
              <AvatarFallback className="bg-slate-100 text-[9px] text-slate-600">
                {getInitials(task.assignee_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm leading-snug transition-all inline",
                  isMine ? "font-bold text-slate-900" : "font-medium text-slate-600",
                  isCompleted && "line-through decoration-slate-300"
                )}
              >
                {task.summary}
                {!isCompleted && (
                  <>
                    {' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(task.id);
                      }}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-50 border border-orange-300 text-orange-600 hover:scale-110 transition-transform ml-1"
                      title="Add subtask"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddReply(task.id);
                      }}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:scale-110 transition-transform ml-1"
                      title="Reply"
                    >
                      <Reply className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Right Side: Due Date + Checkbox (Stacked) */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {task.due_date && (
                <span className={cn(
                  "text-[10px] whitespace-nowrap font-medium",
                  isOverdue ? "text-red-500 font-bold" : "text-slate-400"
                )}>
                  {format(parseISO(task.due_date), 'MMM d')}
                </span>
              )}
              <button
                onClick={() => onComplete(task.id, task.task_status)}
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

      {/* Children and Reply Editor */}
      <AnimatePresence>
        {isExpanded && (
          <div className="ml-6 border-l-2 border-dotted border-gray-300 pl-2">
            {/* Render Children */}
            {task.children?.map((child) => (
              <TaskNode
                key={child.id}
                task={child}
                dealId={dealId}
                depth={depth + 1}
                onComplete={onComplete}
                onPickup={onPickup}
                onAddChild={onAddChild}
                onAddReply={onAddReply}
                currentUserId={currentUserId}
                users={users}
                addingChildTo={addingChildTo}
                addingReplyTo={addingReplyTo}
                onSaveTask={onSaveTask}
                onCancelTask={onCancelTask}
                expandedTasks={expandedTasks}
                onToggleExpand={onToggleExpand}
              />
            ))}

            {/* Adding Child Editor */}
            {isAddingChild && (
              <InlineTaskEditor
                users={users}
                currentUser={currentUser}
                onSave={(s, a, d) => onSaveTask(s, a, d, task.id, false)}
                onCancel={onCancelTask}
                depth={depth + 1}
                isReply={false}
              />
            )}

            {/* Adding Reply Editor */}
            {isAddingReply && (
              <InlineTaskEditor
                users={users}
                currentUser={currentUser}
                onSave={(s, a, d) => onSaveTask(s, a, d, task.id, true)}
                onCancel={onCancelTask}
                depth={depth + 1}
                isReply={true}
              />
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [addingRootTo, setAddingRootTo] = useState<string | null>(null);
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
  const [addingReplyTo, setAddingReplyTo] = useState<string | null>(null);

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
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel('task-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: 'is_task=eq.true' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleToggleDeal = (id: string) => {
    setExpandedDeals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleTask = (id: string) => {
    setExpandedTasks((prev) => {
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

  const handleSaveNewTask = async (
    summary: string,
    assignee: string,
    date: string,
    parentId?: string,
    isReply?: boolean
  ) => {
    try {
      let targetDealId = '';

      if (addingRootTo) {
        targetDealId = addingRootTo;
      } else if (parentId) {
        for (const group of dealGroups) {
          const findDeal = (tasks: TaskThread[]): boolean => {
            return tasks.some(t => t.id === parentId || findDeal(t.children || []));
          };
          if (findDeal(group.tasks || [])) {
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
        related_to_type: 'Opportunity',
      };

      if (parentId) {
        payload.parent_task_id = parentId;
      }

      if (date) {
        payload.due_date = new Date(date).toISOString();
      }

      const { error } = await supabase.from('activities').insert(payload);
      if (error) throw error;

      toast({ title: 'Task Created' });
      setAddingRootTo(null);
      setAddingChildTo(null);
      setAddingReplyTo(null);

      if (parentId) {
        setExpandedTasks(prev => new Set(prev).add(parentId));
      }

      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filterTasks = (tasks: TaskThread[]): TaskThread[] => {
    if (!hideCompleted) return tasks;
    return tasks
      .filter(t => t.task_status !== 'Completed')
      .map(t => ({ ...t, children: t.children ? filterTasks(t.children) : [] }));
  };

  const displayGroups = useMemo(() => {
    return dealGroups
      .map(group => {
        let tasks = group.tasks || [];
        if (hideCompleted) {
          tasks = filterTasks(tasks);
        }
        if (search) {
          const matchSearch = (t: TaskThread): boolean => {
            return t.summary.toLowerCase().includes(search.toLowerCase()) ||
              (t.children && t.children.some(matchSearch)) || false;
          };
          tasks = tasks.filter(matchSearch);
        }
        return { ...group, tasks };
      })
      .filter(g => g.tasks.length > 0 || g.name.toLowerCase().includes(search.toLowerCase()));
  }, [dealGroups, hideCompleted, search]);

  const currentUser = users.find(u => u.id === user?.id);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-[50] bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-xs font-medium text-slate-600">Hide completed</span>
          </label>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-slate-50 border-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Deals List */}
      <div className="space-y-3 p-4">
        {displayGroups.map((group) => {
          const isExpanded = expandedDeals.has(group.id);
          const taskTree = buildTaskTree(group.tasks || []);
          const isAddingRoot = addingRootTo === group.id;

          return (
            <div key={group.id} className="bg-white">
              {/* Deal Header */}
              <div
                onClick={() => handleToggleDeal(group.id)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors py-2 px-2 rounded-lg"
              >
                <ChevronRight
                  className={cn("w-5 h-5 text-slate-400 transition-transform flex-shrink-0", isExpanded && "rotate-90")}
                />
                {getStageAvatar(group.stage)}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate">{group.name}</span>
                  {group.mw > 0 && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {group.mw} MW
                    </span>
                  )}
                </div>
              </div>

              {/* Tasks Tree */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 border-l-2 border-dotted border-gray-300 pl-2 mt-1"
                  >
                    {taskTree.map((task) => (
                      <TaskNode
                        key={task.id}
                        task={task}
                        dealId={group.id}
                        depth={0}
                        onComplete={handleComplete}
                        onPickup={handlePickup}
                        onAddChild={(id) => {
                          setAddingChildTo(id);
                          setAddingReplyTo(null);
                          setAddingRootTo(null);
                          setExpandedTasks(prev => new Set(prev).add(id));
                        }}
                        onAddReply={(id) => {
                          setAddingReplyTo(id);
                          setAddingChildTo(null);
                          setAddingRootTo(null);
                          setExpandedTasks(prev => new Set(prev).add(id));
                        }}
                        currentUserId={user?.id}
                        users={users}
                        addingChildTo={addingChildTo}
                        addingReplyTo={addingReplyTo}
                        onSaveTask={handleSaveNewTask}
                        onCancelTask={() => {
                          setAddingChildTo(null);
                          setAddingReplyTo(null);
                        }}
                        expandedTasks={expandedTasks}
                        onToggleExpand={handleToggleTask}
                      />
                    ))}

                    {/* Root Add Editor */}
                    {isAddingRoot && (
                      <InlineTaskEditor
                        users={users}
                        currentUser={currentUser}
                        onSave={(s, a, d) => handleSaveNewTask(s, a, d)}
                        onCancel={() => setAddingRootTo(null)}
                        depth={0}
                        isReply={false}
                      />
                    )}

                    {/* Root Add Button (+1) */}
                    {!isAddingRoot && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setAddingRootTo(group.id);
                            setAddingChildTo(null);
                            setAddingReplyTo(null);
                          }}
                          className="w-7 h-7 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center text-orange-600 hover:scale-110 transition-transform shadow-sm"
                          title="Add root task"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {!loading && displayGroups.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksScreen;
