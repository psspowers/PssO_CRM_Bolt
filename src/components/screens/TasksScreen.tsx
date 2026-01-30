// src/screens/TasksScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth'; // your auth hook
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Plus, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, PanInfo } from 'framer-motion'; // for swipe; install if needed

interface DealGroup {
  deal: {
    id: string;
    name: string;
    stage: string;
    value: number; // MW
    account_name: string;
  };
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: TaskThread[];
}

interface TaskThread {
  id: string;
  summary: string;
  details?: string;
  task_status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  assigned_to_id: string;
  parent_task_id: string | null;
  created_at: string;
  // joined fields
  assigned_to?: { name: string; avatar_url: string };
  // children added client-side if needed
}

type ViewMode = 'all' | 'mine' | 'overdue';

export default function TasksScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());

  const rpcFilter = viewMode === 'mine' ? 'mine' : 'all';

  const { data: dealGroups = [], isLoading } = useQuery<DealGroup[]>({
    queryKey: ['task_threads', rpcFilter, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_task_threads', {
          p_user_id: user?.id,
          p_filter: rpcFilter,
        });
      if (error) throw error;
      return data;
    },
  });

  // Client-side overdue filter + search
  const filteredGroups = useMemo(() => {
    let groups = dealGroups;

    if (viewMode === 'overdue') {
      groups = groups.filter((group) =>
        group.tasks.some((t) => new Date(t.due_date) < new Date() && t.task_status !== 'Completed')
      );
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      groups = groups.filter((group) =>
        group.deal.name.toLowerCase().includes(lower) ||
        group.deal.account_name?.toLowerCase().includes(lower) ||
        group.tasks.some((t) => t.summary.toLowerCase().includes(lower) || t.details?.toLowerCase().includes(lower))
      );
    }

    return groups;
  }, [dealGroups, viewMode, searchTerm]);

  // Realtime: invalidate on activity changes (since tasks are activities)
  useEffect(() => {
    const channel = supabase.channel('activities_changes').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities', filter: "is_task=eq.true" },
      () => queryClient.invalidateQueries({ queryKey: ['task_threads'] })
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const toggleDeal = (dealId: string) => {
    setExpandedDeals((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId); else next.add(dealId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals, tasks, accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {/* open global composer */}}>
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'mine', 'overdue'] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(mode)}
          >
            {mode === 'all' ? 'All' : mode === 'mine' ? 'My Tasks' : 'Overdue'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">Loading deal threads...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No tasks match your filter
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-5">
          {filteredGroups.map((group) => (
            <DealThread
              key={group.deal.id}
              group={group}
              isExpanded={expandedDeals.has(group.deal.id)}
              toggleExpand={() => toggleDeal(group.deal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component for each deal thread
function DealThread({ group, isExpanded, toggleExpand }: { group: DealGroup; isExpanded: boolean; toggleExpand: () => void }) {
  const { deal, progress, total_tasks, completed_tasks, tasks } = group;
  const hasOverdue = tasks.some((t) => new Date(t.due_date) < new Date() && t.task_status !== 'Completed');

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
        onClick={toggleExpand}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-semibold text-lg">{deal.name}</h3>
            <span className="text-xl font-bold text-orange-600">{deal.value} MW</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {deal.account_name} • {deal.stage}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">
              {completed_tasks}/{total_tasks} ({Math.round(progress)}%)
            </div>
            {hasOverdue && <AlertCircle className="h-5 w-5 text-orange-500 inline ml-2" />}
          </div>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} level={0} />
          ))}
          <Button variant="outline" size="sm" className="mt-2">
            + Add task to this deal
          </Button>
        </div>
      )}
    </div>
  );
}

// Recursive TaskItem (for sub-tasks if RPC returns hierarchy; otherwise flat indented by parent)
const TaskItem = React.memo(({ task, level }: { task: TaskThread; level: number }) => {
  const isOverdue = new Date(task.due_date) < new Date() && task.task_status !== 'Completed';
  const priorityColor = task.priority === 'High' ? 'text-red-600' : task.priority === 'Medium' ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className={cn('flex gap-4 py-3 border-t', level > 0 && 'ml-8 border-l-2 border-muted pl-4')}>
      {/* Avatar */}
      <img
        src={task.assigned_to?.avatar_url || '/default-avatar.png'}
        alt={task.assigned_to?.name}
        className="h-10 w-10 rounded-full flex-shrink-0"
      />

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <p className={cn('font-medium', task.task_status === 'Completed' && 'line-through opacity-70')}>
            {task.summary}
          </p>
          <span className={cn('text-sm whitespace-nowrap ml-4', isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        </div>

        {task.details && <p className="text-sm text-muted-foreground mt-1">{task.details}</p>}

        <div className="flex gap-3 mt-2 text-sm">
          <span className={cn('font-medium', priorityColor)}>{task.priority} priority</span>
          <span>• {task.assigned_to?.name || 'Unassigned'}</span>
          {task.task_status === 'Completed' ? (
            <span className="text-green-600">Completed</span>
          ) : (
            <span className="text-orange-600">Pending</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm">Complete</Button>
          <Button variant="ghost" size="sm">Reply (sub-task)</Button>
        </div>
      </div>
    </div>
  );
});