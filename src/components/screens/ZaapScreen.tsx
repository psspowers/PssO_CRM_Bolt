import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Square,
  Plus,
  Minus,
  Clock,
  Filter,
  Search,
  ChevronDown,
  Loader2,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';

interface TaskThread {
  id: string;
  summary: string;
  details: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  parentTaskId: string | null;
  children?: TaskThread[];
}

interface DealThread {
  dealId: string;
  dealName: string;
  accountName: string;
  stage: string;
  mw: number;
  pulseLinked: boolean;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  tasks: TaskThread[];
}

const getStageConfig = (stage: string) => {
  const configs: Record<string, { char: string; color: string; label: string }> = {
    'Prospect': { char: '', color: 'bg-slate-300', label: 'Prospect' },
    'Qualified': { char: 'Q', color: 'bg-blue-500', label: 'Qualified' },
    'Proposal': { char: 'P', color: 'bg-amber-500', label: 'Proposal' },
    'Negotiation': { char: 'N', color: 'bg-purple-500', label: 'Negotiation' },
    'Term Sheet': { char: 'T', color: 'bg-teal-500', label: 'Term Sheet' },
    'Won': { char: 'W', color: 'bg-green-500', label: 'Won' }
  };
  return configs[stage] || { char: '', color: 'bg-slate-300', label: stage };
};

export const ZaapScreen: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDeals();
  }, [user]);

  const fetchDeals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_deal_threads_view', {
        p_user_id: user.id
      });

      if (error) throw error;

      const grouped = groupTasksByDeal(data || []);
      setDeals(grouped);
    } catch (error: any) {
      console.error('Error fetching deals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const groupTasksByDeal = (data: any[]): DealThread[] => {
    const dealMap = new Map<string, DealThread>();

    data.forEach((row: any) => {
      if (!dealMap.has(row.deal_id)) {
        dealMap.set(row.deal_id, {
          dealId: row.deal_id,
          dealName: row.deal_name,
          accountName: row.account_name,
          stage: row.deal_stage,
          mw: row.deal_mw,
          pulseLinked: row.pulse_linked,
          totalTasks: 0,
          completedTasks: 0,
          progress: 0,
          tasks: []
        });
      }

      if (row.task_id) {
        const deal = dealMap.get(row.deal_id)!;
        deal.tasks.push({
          id: row.task_id,
          summary: row.task_summary,
          details: row.task_details,
          status: row.task_status,
          priority: row.task_priority,
          dueDate: row.task_due_date,
          assignedToId: row.task_assigned_to,
          assigneeName: row.assignee_name,
          parentTaskId: row.parent_task_id
        });
      }
    });

    dealMap.forEach(deal => {
      deal.totalTasks = deal.tasks.length;
      deal.completedTasks = deal.tasks.filter(t => t.status === 'Completed').length;
      deal.progress = deal.totalTasks > 0 ? (deal.completedTasks / deal.totalTasks) * 100 : 0;
    });

    return Array.from(dealMap.values());
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

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';

    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task Updated',
        description: `Task marked as ${newStatus}`,
        className: 'bg-green-50 border-green-200'
      });

      fetchDeals();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  const toggleExpanded = (taskId: string) => {
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

  const addSubtask = async (parentTaskId: string, dealId: string) => {
    const summary = prompt('Enter subtask name:');
    if (!summary?.trim()) return;

    try {
      const { error } = await supabase.from('activities').insert({
        type: 'Task',
        summary,
        status: 'Pending',
        related_to_id: dealId,
        related_to_type: 'opportunity',
        assigned_to: user?.id,
        parent_task_id: parentTaskId,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: 'Subtask Added',
        description: 'New subtask created successfully',
        className: 'bg-green-50 border-green-200'
      });

      fetchDeals();
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

  const renderTask = (task: TaskThread & { children?: TaskThread[] }, dealId: string, depth: number = 0, isLast: boolean = false): React.ReactNode => {
    const isCompleted = task.status === 'Completed';
    const isMine = task.assignedToId === user?.id;
    const isExpanded = expandedTasks.has(task.id);
    const hasChildren = task.children && task.children.length > 0;

    return (
      <div key={task.id} className="relative">
        {depth > 0 && (
          <>
            <div
              className="absolute left-0 top-0 w-px bg-slate-200"
              style={{
                left: `${(depth - 1) * 24 + 12}px`,
                height: isLast ? '24px' : '100%'
              }}
            />
            <div
              className="absolute top-6 h-px bg-slate-200"
              style={{
                left: `${(depth - 1) * 24 + 12}px`,
                width: '12px'
              }}
            />
          </>
        )}

        <div
          className="flex items-center gap-2 py-1.5"
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(task.id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          )}

          {!hasChildren && depth > 0 && <div className="w-5" />}

          <button
            onClick={() => toggleTask(task.id, task.status)}
            className="flex-shrink-0"
          >
            {isCompleted ? (
              <CheckSquare className="w-4 h-4 text-green-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <div
            className={`flex-1 min-w-0 px-2 py-1 rounded ${
              isMine && !isCompleted ? 'bg-yellow-100' : ''
            } ${isCompleted ? 'opacity-60' : ''}`}
          >
            <span className={`text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {task.summary}
            </span>
          </div>

          <button
            onClick={() => addSubtask(task.id, dealId)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {task.children!.map((child, idx) =>
              renderTask(child, dealId, depth + 1, idx === task.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredDeals = deals.filter(deal =>
    deal.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.accountName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Zaap</h1>
        <Button variant="ghost" size="icon">
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-0">
        {filteredDeals.map(deal => {
          const stageConfig = getStageConfig(deal.stage);
          const taskTree = buildTaskTree(deal.tasks);

          return (
            <div key={deal.dealId} className="py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-full ${stageConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {stageConfig.char}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{deal.dealName}</h3>
                  <p className="text-xs text-slate-500">{deal.accountName}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-slate-900">{deal.mw} MW</div>
                </div>
              </div>

              <div className="pl-13 space-y-2">
                <div className="flex items-center gap-2">
                  <Progress value={deal.progress} className="h-1 flex-1" />
                  {deal.pulseLinked && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Pulse Linked
                    </Badge>
                  )}
                </div>

                {taskTree.length > 0 && (
                  <div className="mt-3 space-y-0">
                    {taskTree.map((task, idx) =>
                      renderTask(task, deal.dealId, 0, idx === taskTree.length - 1)
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredDeals.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No deals found
          </div>
        )}
      </div>
    </div>
  );
};
