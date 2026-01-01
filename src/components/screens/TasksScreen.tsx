import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, Clock, AlertCircle, Loader2, User, Target } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Activity } from '../../types/crm';

interface TaskItem {
  id: string;
  summary: string;
  details?: string;
  dueDate?: Date;
  taskStatus?: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  assignedToId?: string;
  source: 'activity' | 'opportunity' | 'project';
  sourceId: string;
  sourceName?: string;
}

export const TasksScreen: React.FC = () => {
  const { activities, opportunities, accounts, currentUser, users, updateActivity, updateOpportunity, loading } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const tasks = useMemo(() => {
    const taskItems: TaskItem[] = [];

    // Add tasks from activities
    const activityTasks = activities
      .filter(a => a.isTask === true)
      .filter(a => filter === 'all' || a.assignedToId === currentUser?.id)
      .map(a => ({
        id: a.id,
        summary: a.summary,
        details: a.details,
        dueDate: a.dueDate,
        taskStatus: a.taskStatus,
        priority: a.priority,
        assignedToId: a.assignedToId,
        source: 'activity' as const,
        sourceId: a.id,
      }));

    taskItems.push(...activityTasks);

    // Add next actions from opportunities
    const opportunityTasks = opportunities
      .filter(o => o.nextAction && o.nextActionDate)
      .filter(o => filter === 'all' || o.ownerId === currentUser?.id)
      .map(o => {
        const account = accounts.find(a => a.id === o.accountId);
        return {
          id: `opp-${o.id}`,
          summary: o.nextAction!,
          details: account ? `Opportunity: ${o.name} (${account.name})` : `Opportunity: ${o.name}`,
          dueDate: o.nextActionDate,
          taskStatus: undefined,
          priority: o.priority,
          assignedToId: o.ownerId,
          source: 'opportunity' as const,
          sourceId: o.id,
          sourceName: o.name,
        };
      });

    taskItems.push(...opportunityTasks);

    // Sort by due date
    return taskItems.sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [activities, opportunities, accounts, filter, currentUser]);

  const toggleTask = async (task: TaskItem) => {
    if (task.source === 'activity') {
      const newStatus = task.taskStatus === 'Completed' ? 'Pending' : 'Completed';
      await updateActivity(task.sourceId, { taskStatus: newStatus });
    } else if (task.source === 'opportunity') {
      // Mark opportunity next action as complete by clearing it
      await updateOpportunity(task.sourceId, {
        nextAction: '',
        nextActionDate: undefined
      });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button 
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
        > Team Tasks </button>
        <button 
          onClick={() => setFilter('mine')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${filter === 'mine' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
        > My Tasks </button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No tasks found</p>
          </div>
        ) : (
          tasks.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.taskStatus !== 'Completed';
            const assignee = users.find(u => u.id === task.assignedToId);
            const isCompleted = task.taskStatus === 'Completed';

            return (
              <div key={task.id} className={`p-4 bg-white border rounded-xl shadow-sm flex gap-3 ${isCompleted ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleTask(task)} className="mt-1">
                  {isCompleted ? <CheckSquare className="text-green-500" /> : <Square className="text-gray-300" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.summary}
                    </h4>
                    {task.source === 'opportunity' && (
                      <Target className="w-4 h-4 text-orange-500 flex-shrink-0" title="Opportunity Task" />
                    )}
                  </div>
                  {task.details && <p className="text-sm text-gray-500 mt-1">{task.details}</p>}

                  <div className="flex items-center gap-4 mt-3">
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      {assignee?.name || 'Unassigned'}
                    </div>
                    {task.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        task.priority === 'High' ? 'bg-red-100 text-red-700' :
                        task.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
