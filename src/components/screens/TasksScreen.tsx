import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, Search, X, Plus, Calendar, Check, ChevronRight, CornerDownRight, Filter, Eye, EyeOff, User } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const INDENT_PX = 28;

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
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white z-20 relative', s.bg, s.color)}>
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
      className="relative flex items-start py-2 pr-2"
    >
      <div className="flex-1 flex items-start gap-2 relative z-10">
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
               <button onClick={() => onSave(summary, assigneeId, dueDate)} className="p-1 hover:bg-green-50 rounded text-green-600"><Check className="w-3.5 h-3.5" /></button>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TaskNode = ({
  task, dealId, depth, isLast, expanded, onToggle, onComplete, onPickup, onAdd,
  currentUserId, users, addingToId, onSaveTask, onCancelTask
}: any) => {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const isExpanded = expanded.has(task.id);
  const hasChildren = task.children && task.children.length > 0;
  const isAddingChild = addingToId === task.id;

  const avatarSize = depth === 0 ? 'w-7 h-7' : 'w-6 h-6';

  if (task.isOptimistic) {
     return (
       <div className="py-2 pl-8 opacity-50 animate-pulse text-xs text-slate-400 flex items-center gap-2">
         <Loader2 className="w-3 h-3 animate-spin" /> Saving task...
       </div>
     );
  }

  return (
    <div className="relative">
      <div className={`relative flex items-start gap-3 py-1 pr-2 group transition-colors rounded-lg ${isCompleted ? 'opacity-50 grayscale' : 'hover:bg-slate-50'}`}>

        <div className="w-4 flex justify-center mt-1.5 flex-shrink-0">
          {hasChildren && (
             <button
               onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
               className="z-10 w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded transition-colors"
             >
                <ChevronRight className={cn("w-3 h-3 text-slate-500 transition-transform", isExpanded && "rotate-90")} />
             </button>
           )}
        </div>

        <div className="flex-1 flex items-start gap-3 min-w-0">
          {isUnassigned ? (
            <button onClick={() => onPickup(task.id)} className={cn(avatarSize, "rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-white")}>
               <Hand className="w-3 h-3 text-amber-600" />
            </button>
          ) : (
            <Avatar className={cn(avatarSize, "ring-2 ring-white shadow-sm flex-shrink-0")}>
              <AvatarImage src={task.assignee_avatar} />
              <AvatarFallback className="bg-slate-100 text-[9px] text-slate-600">{getInitials(task.assignee_name)}</AvatarFallback>
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
                {task.details && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{task.details}</p>}
              </div>

              <div className="flex flex-col items-end gap-1">
                {task.due_date && <span className="text-[10px] text-slate-400 whitespace-nowrap">{format(new Date(task.due_date), 'MMM d')}</span>}
                <button
                  onClick={() => onComplete(task.id, task.task_status)}
                  className="text-slate-300 hover:text-green-500 transition-colors"
                >
                  {isCompleted ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isCompleted && (
              <button
                 onClick={() => onAdd(task.id)}
                 className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-orange-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <CornerDownRight className="w-3 h-3" /> Reply
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && task.children && (
          <div className="ml-6 border-l-2 border-dotted border-gray-300 pl-2">
            {task.children.map((child: TaskThread, idx: number) => (
              <TaskNode
                key={child.id} task={child} dealId={dealId} depth={depth + 1}
                isLast={idx === task.children!.length - 1 && !isAddingChild}
                expanded={expanded} onToggle={onToggle} onComplete={onComplete} onPickup={onPickup} onAdd={onAdd}
                currentUserId={currentUserId} users={users} addingToId={addingToId}
                onSaveTask={onSaveTask} onCancelTask={onCancelTask}
              />
            ))}

            {isAddingChild && (
              <InlineTaskEditor
                users={users} currentUser={users.find((u:any) => u.id === currentUserId)}
                onSave={(s, a, d) => onSaveTask(s, a, d, task.id)}
                onCancel={onCancelTask}
              />
            )}

            {!isAddingChild && (
              <div className="relative h-6 w-full flex items-center">
                 <button
                   onClick={(e) => { e.stopPropagation(); onAdd(task.id); }}
                   className="w-5 h-5 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center text-orange-600 hover:scale-110 transition-transform shadow-sm"
                   title="Add Subtask"
                 >
                   <Plus className="w-3 h-3" />
                 </button>
              </div>
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

  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [isRootAdd, setIsRootAdd] = useState(false);

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

  useEffect(() => { fetchTasks(); }, [user]);

  const handleToggleDeal = (id: string) => {
    setExpandedDeals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleTask = (id: string) => {
    setExpandedTasks(prev => {
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
      for (const group of dealGroups) {
         if (isRootAdd && group.id === addingToId) targetDealId = group.id;
         if (!isRootAdd) {
            const contains = (tasks: TaskThread[]): boolean => tasks.some(t => t.id === parentId || contains(t.children || []));
            if (contains(group.tasks || [])) targetDealId = group.id;
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

      if (!isRootAdd && parentId) payload.parent_task_id = parentId;
      if (date) payload.due_date = new Date(date).toISOString();

      const { error } = await supabase.from('activities').insert(payload);
      if (error) throw error;

      toast({ title: 'Task Created' });
      setAddingToId(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const displayGroups = useMemo(() => {
    return dealGroups.map(group => {
      let tasks = group.tasks || [];
      if (hideCompleted) tasks = tasks.filter(t => t.task_status !== 'Completed');
      if (search) tasks = tasks.filter(t => t.summary.toLowerCase().includes(search.toLowerCase()));
      return { ...group, tasks };
    }).filter(g => g.tasks.length > 0 || g.name.toLowerCase().includes(search.toLowerCase()));
  }, [dealGroups, hideCompleted, search]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-[50] bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <button
             onClick={() => setHideCompleted(!hideCompleted)}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${hideCompleted ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideCompleted ? 'Hidden' : 'Show All'}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="w-full bg-slate-50 border-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      <div className="p-0 space-y-0">
        {displayGroups.map(group => {
            const isExpanded = expandedDeals.has(group.id);
            const taskTree = buildTaskTree(group.tasks || []);
            const isAddingRoot = addingToId === group.id && isRootAdd;

            return (
              <div key={group.id} className="relative border-b border-slate-100 py-4">
                 <div
                   onClick={() => handleToggleDeal(group.id)}
                   className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors relative z-10"
                 >
                    <ChevronRight className={cn("w-5 h-5 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
                    {getStageAvatar(group.stage)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">{group.name}</span>
                        {group.mw > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{group.mw} MW</span>}
                      </div>
                    </div>
                 </div>

                 <div className="absolute bottom-0 left-12 right-0 h-[2px] bg-orange-100">
                    <div className="h-full bg-orange-500" style={{ width: '40%' }} />
                 </div>

                 <AnimatePresence>
                   {isExpanded && (
                     <div className="ml-4 border-l-2 border-dotted border-gray-300 pl-2 mt-2">
                       {taskTree.map((task, idx) => (
                         <TaskNode
                           key={task.id} task={task} dealId={group.id} depth={0}
                           isLast={idx === taskTree.length - 1}
                           expanded={expandedTasks} onToggle={handleToggleTask}
                           onComplete={handleComplete} onPickup={handlePickup}
                           onAdd={(id: string) => { setAddingToId(id); setIsRootAdd(false); setExpandedTasks(prev => new Set(prev).add(id)); }}
                           currentUserId={user?.id} users={users}
                           addingToId={addingToId} onSaveTask={handleSaveNewTask} onCancelTask={() => setAddingToId(null)}
                         />
                       ))}

                       {!isAddingRoot && (
                         <div className="relative h-8 w-full flex items-center mt-2">
                           <button
                             onClick={() => { setAddingToId(group.id); setIsRootAdd(true); }}
                             className="w-6 h-6 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center text-orange-600 hover:scale-110 transition-transform shadow-sm"
                             title="Add Task to Deal"
                           >
                             <Plus className="w-4 h-4" />
                           </button>
                         </div>
                       )}

                       {isAddingRoot && (
                         <InlineTaskEditor
                           users={users} currentUser={users.find(u=>u.id===user?.id)}
                           onSave={(s,a,d) => handleSaveNewTask(s,a,d)}
                           onCancel={() => setAddingToId(null)}
                         />
                       )}
                     </div>
                   )}
                 </AnimatePresence>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default TasksScreen;
