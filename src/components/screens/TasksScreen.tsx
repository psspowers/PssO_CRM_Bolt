import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, Search, X, Plus, Calendar, Check, ChevronRight, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const INDENT_PX = 32;

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
  completed_tasks?: number;
  total_tasks?: number;
  progress?: number;
}

const getStageAvatar = (stage: string) => {
  const configs: Record<string, { char: string; color: string }> = {
    'Prospect': { char: '•', color: 'bg-slate-200 text-slate-500' },
    'Qualified': { char: 'Q', color: 'bg-blue-500 text-white' },
    'Proposal': { char: 'P', color: 'bg-amber-500 text-white' },
    'Negotiation': { char: 'N', color: 'bg-purple-500 text-white' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500 text-white' },
    'Won': { char: 'W', color: 'bg-green-500 text-white' },
  };
  const s = configs[stage] || { char: '?', color: 'bg-slate-300 text-white' };
  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white z-20 relative', s.color)}>
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
  depth,
  users,
  currentUser,
  onSave,
  onCancel,
}: {
  depth: number;
  users: any[];
  currentUser: any;
  onSave: (summary: string, assignee: string, date: string) => void;
  onCancel: () => void;
}) => {
  const [summary, setSummary] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const indent = depth * INDENT_PX;
  const spineLeft = indent + 27;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="relative flex items-start py-2 pr-4"
    >
      <div className="absolute w-[2px] bg-slate-300" style={{ left: `${spineLeft}px`, top: '-10px', bottom: '0' }} />
      <div className="absolute h-[2px] w-[14px] bg-slate-300" style={{ left: `${spineLeft}px`, top: '18px' }} />

      <div className="flex-1 flex flex-col gap-2 relative z-10 pl-3" style={{ marginLeft: `${spineLeft + 14}px` }}>
        <input
          ref={inputRef}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && summary.trim()) onSave(summary, assigneeId, dueDate);
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Type task..."
          className="w-full bg-transparent border-b-2 border-orange-400 focus:border-orange-600 outline-none text-sm font-medium py-1 placeholder:text-slate-400"
        />

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1">
             <User className="w-3 h-3 text-slate-400" />
             <select
               value={assigneeId}
               onChange={e => setAssigneeId(e.target.value)}
               className="bg-transparent text-[10px] outline-none text-slate-600 w-20 truncate cursor-pointer"
             >
               <option value={currentUser?.id}>Me</option>
               {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
             </select>
           </div>

           <div className="flex items-center gap-1">
             <Calendar className="w-3 h-3 text-slate-400" />
             <input
               type="date"
               value={dueDate}
               onChange={e => setDueDate(e.target.value)}
               className="bg-transparent text-[10px] outline-none text-slate-600 w-24 cursor-pointer"
             />
           </div>

           <div className="flex items-center gap-2 ml-auto">
             <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-3.5 h-3.5" /></button>
             <button onClick={() => onSave(summary, assigneeId, dueDate)} className="p-1 hover:bg-green-50 rounded text-green-600"><Check className="w-3.5 h-3.5" /></button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

const TaskRow = ({
  task, dealId, depth, isLast, expanded, onToggle, onComplete, onPickup, onAdd,
  currentUserId, users, addingToId, onSaveTask, onCancelTask
}: any) => {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const isExpanded = expanded.has(task.id);
  const hasChildren = task.children && task.children.length > 0;
  const isAddingChild = addingToId === task.id;

  const indent = depth * INDENT_PX;
  const spineLeft = indent + 27;

  if (task.isOptimistic) {
     return (
       <div className="py-2 pl-12 opacity-50 animate-pulse text-xs text-slate-400 flex items-center gap-2" style={{ paddingLeft: `${indent + 48}px` }}>
         <Loader2 className="w-3 h-3 animate-spin" /> Saving...
       </div>
     );
  }

  return (
    <>
      <div className={`relative flex items-start py-1.5 pr-4 group transition-colors ${isCompleted ? 'opacity-50 grayscale' : 'hover:bg-slate-50/50'}`}>

        <div
          className="absolute w-[2px] bg-slate-300 z-0"
          style={{
            left: `${spineLeft}px`,
            top: '-12px',
            bottom: isLast ? '50%' : '-12px'
          }}
        />

        <div
          className="absolute h-[2px] w-[14px] bg-slate-300 z-0"
          style={{ left: `${spineLeft}px`, top: '50%' }}
        />

        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            className="absolute z-10 w-4 h-4 flex items-center justify-center bg-white border border-slate-300 rounded-full hover:bg-slate-100 transition-transform"
            style={{ left: `${spineLeft - 7}px`, top: '50%', transform: 'translateY(-50%)' }}
          >
             <ChevronRight className={cn("w-2.5 h-2.5 text-slate-500", isExpanded && "rotate-90")} />
          </button>
        )}

        <div className="flex-1 flex items-start gap-3 relative z-10" style={{ paddingLeft: `${indent + 48}px` }}>
          {isUnassigned ? (
            <button onClick={() => onPickup(task.id)} className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-white">
               <Hand className="w-3 h-3 text-amber-600" />
            </button>
          ) : (
            <Avatar className="w-6 h-6 ring-2 ring-white shadow-sm">
              <AvatarImage src={task.assignee_avatar} />
              <AvatarFallback className="bg-slate-100 text-[9px]">{getInitials(task.assignee_name)}</AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className={cn(
                "text-sm leading-tight transition-all",
                isMine ? "font-bold text-slate-900" : "font-normal text-slate-600",
                isCompleted && "line-through decoration-slate-300"
              )}>
                {task.summary}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => onComplete(task.id, task.task_status)}
                className="text-slate-300 hover:text-green-500 transition-colors"
              >
                {isCompleted ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && task.children?.map((child: TaskThread, idx: number) => (
          <TaskRow
            key={child.id} task={child} dealId={dealId} depth={depth + 1}
            isLast={idx === task.children!.length - 1 && !isAddingChild}
            expanded={expanded} onToggle={onToggle} onComplete={onComplete} onPickup={onPickup} onAdd={onAdd}
            currentUserId={currentUserId} users={users} addingToId={addingToId}
            onSaveTask={onSaveTask} onCancelTask={onCancelTask}
          />
        ))}
      </AnimatePresence>

      {isAddingChild && (
        <InlineTaskEditor
          depth={depth + 1} users={users} currentUser={users.find((u:any) => u.id === currentUserId)}
          onSave={(s, a, d) => onSaveTask(s, a, d, task.id)}
          onCancel={onCancelTask}
        />
      )}

      {isExpanded && !isAddingChild && (
        <div className="relative h-6 w-full flex items-center">
           <div className="absolute w-[2px] bg-slate-300" style={{ left: `${indent + INDENT_PX + 27}px`, top: '-12px', bottom: '50%' }} />
           <button
             onClick={(e) => { e.stopPropagation(); onAdd(task.id); }}
             className="absolute w-5 h-5 rounded-full bg-white border border-red-400 flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-transform shadow-sm z-20"
             style={{ left: `${indent + INDENT_PX + 18}px`, top: '50%', transform: 'translateY(-50%)' }}
           >
             <Plus className="w-3 h-3" />
           </button>
        </div>
      )}
    </>
  );
};

const DealThreadItem = ({
  group, expanded, expandedDeals, onToggleDealExpand, onAddRootTask, addingRootToDealId, ...props
}: any) => {
  const isDealExpanded = expandedDeals.has(group.id);
  const isAddingRoot = addingRootToDealId === group.id;
  const taskTree = buildTaskTree(group.tasks || []);

  const completedCount = (group.tasks || []).filter((t: TaskThread) => t.task_status === 'Completed').length;
  const totalCount = (group.tasks || []).length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="relative border-b border-slate-100 py-4">
      <div className="flex items-center gap-3 px-4 cursor-pointer" onClick={() => onToggleDealExpand(group.id)}>
        <ChevronRight className={cn('w-5 h-5 text-slate-400 transition-transform', isDealExpanded && 'rotate-90')} />
        {getStageAvatar(group.stage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm truncate">{group.name}</h3>
            {group.mw > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{group.mw} MW</span>}
          </div>
        </div>
        <div className="text-xs text-slate-400">{completedCount}/{totalCount}</div>
      </div>

      <div className="absolute bottom-0 left-12 right-0 h-[2px] bg-orange-100">
         <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <AnimatePresence>
        {isDealExpanded && (
          <div className="relative">
            <div className="absolute w-[2px] bg-slate-300" style={{ left: '27px', top: '0', bottom: isAddingRoot ? '0' : '-12px' }} />

            {taskTree.map((task, idx) => (
              <TaskRow
                key={task.id} task={task} dealId={group.id} depth={0}
                isLast={idx === taskTree.length - 1 && !isAddingRoot}
                expanded={expanded} onToggle={props.onToggle} onComplete={props.onComplete}
                onPickup={props.onPickup} onAdd={props.onAddChild}
                currentUserId={props.currentUserId} users={props.users}
                addingToId={props.addingToTaskId} onSaveTask={props.onSaveTask} onCancelTask={props.onCancelTask}
              />
            ))}

            {isAddingRoot && (
              <InlineTaskEditor
                depth={0} users={props.users} currentUser={props.currentUser}
                onSave={(s,a,d) => props.onSaveTask(s,a,d)}
                onCancel={props.onCancelTask}
              />
            )}

            {!isAddingRoot && (
               <div className="relative h-8 w-full flex items-center mt-2">
                 <div className="absolute w-[2px] bg-slate-300" style={{ left: '27px', top: '-12px', bottom: '50%' }} />
                 <button
                   onClick={(e) => { e.stopPropagation(); onAddRootTask(group.id); }}
                   className="absolute left-[18px] w-5 h-5 rounded-full bg-white border border-red-400 flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-transform shadow-sm z-20"
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
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [user]);

  const handleSaveTask = async (summary: string, assignee: string, date: string, parentId?: string) => {
    try {
      const dealId = addingRootToDealId || dealGroups.find(g => g.tasks?.some(t => t.id === addingToId))?.id;

      const payload: any = {
        summary, is_task: true, task_status: 'Pending',
        created_by: user?.id, assigned_to_id: assignee,
        root_deal_id: dealId, related_to_id: dealId, related_to_type: 'Opportunity'
      };
      if (parentId) payload.parent_task_id = parentId;
      if (date) payload.due_date = new Date(date).toISOString();

      const { error } = await supabase.from('activities').insert(payload);
      if (error) throw error;

      toast({ title: 'Task Created' });
      setAddingToId(null);
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
      if (hideCompleted) tasks = tasks.filter(t => t.task_status !== 'Completed');
      if (search) tasks = tasks.filter(t => t.summary.toLowerCase().includes(search.toLowerCase()));
      return { ...group, tasks };
    }).filter(g => g.tasks.length > 0 || g.name.toLowerCase().includes(search.toLowerCase()));
  }, [dealGroups, hideCompleted, search]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-[100] bg-white border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              hideCompleted ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
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
            className="w-full bg-slate-50 border-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-orange-200 outline-none"
          />
        </div>
      </div>

      <div className="p-0">
        {displayGroups.map(group => (
            <DealThreadItem
              key={group.id} group={group}
              expanded={expandedTasks} expandedDeals={expandedDeals}
              onToggleDealExpand={(id: string) => setExpandedDeals(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; })}
              onToggle={(id: string) => setExpandedTasks(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; })}
              onComplete={async (id: string, status?: string) => {
                 await supabase.from('activities').update({ task_status: status==='Completed'?'Pending':'Completed' }).eq('id', id);
                 fetchTasks();
              }}
              onPickup={async (id: string) => {
                 await supabase.from('activities').update({ assigned_to_id: user?.id }).eq('id', id);
                 fetchTasks();
              }}
              onAddRootTask={(id: string) => { setAddingRootToDealId(id); setAddingToId(null); setExpandedDeals(prev => new Set(prev).add(id)); }}
              onAddChild={(id: string, dealId: string) => { setAddingToId(id); setAddingRootToDealId(null); setExpandedTasks(prev => new Set(prev).add(id)); }}
              currentUserId={user?.id} users={users} currentUser={users.find(u => u.id === user?.id)}
              addingToTaskId={addingToId} addingRootToDealId={addingRootToDealId}
              onSaveTask={handleSaveTask} onCancelTask={() => { setAddingToId(null); setAddingRootToDealId(null); }}
            />
        ))}
      </div>
    </div>
  );
};

export default TasksScreen;
