import React, { useState, useMemo } from 'react';
import { X, ListChecks, Zap, CheckCircle2, Clock, PlayCircle, Circle, ChevronRight, Calendar, User } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface TaskMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskMasterModal: React.FC<TaskMasterModalProps> = ({ isOpen, onClose }) => {
  const { activities, updateActivity, users } = useAppContext();
  const { user, profile } = useAuth();
  const [viewMode, setViewMode] = useState<'mine' | 'team'>('mine');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const tasks = useMemo(() => {
    return activities.filter(activity => activity.isTask);
  }, [activities]);

  const myTasks = useMemo(() => {
    return tasks.filter(task => task.assignedToId === user?.id);
  }, [tasks, user?.id]);

  const teamTasks = useMemo(() => {
    if (!isAdmin) return [];
    return tasks;
  }, [tasks, isAdmin]);

  const displayTasks = viewMode === 'mine' ? myTasks : teamTasks;

  const pendingTasks = displayTasks.filter(t => t.taskStatus === 'Pending');
  const inProgressTasks = displayTasks.filter(t => t.taskStatus === 'In Progress');
  const completedTasks = displayTasks.filter(t => t.taskStatus === 'Done');

  const avgVelocity = useMemo(() => {
    const completed = myTasks.filter(t => t.taskStatus === 'Done' && t.updatedAt);
    if (completed.length === 0) return 0;

    const totalDays = completed.reduce((sum, task) => {
      if (!task.createdAt || !task.updatedAt) return sum;
      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt);
      const days = Math.max(1, Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);

    return (totalDays / completed.length).toFixed(1);
  }, [myTasks]);

  const handleStatusChange = async (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Done') => {
    const task = activities.find(a => a.id === taskId);
    if (!task) return;

    await updateActivity(taskId, {
      taskStatus: newStatus,
      updatedAt: new Date()
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-slate-400';
      case 'In Progress': return 'bg-blue-500';
      case 'Done': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return Circle;
      case 'In Progress': return PlayCircle;
      case 'Done': return CheckCircle2;
      default: return Circle;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const assignee = users.find(u => u.id === userId);
    return assignee?.fullName || 'Unknown';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Task Master</h2>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-slate-600">
                  My Velocity: <span className="text-orange-600">{avgVelocity} Days/Task</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('mine')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'mine'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Tasks
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'team'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Team Tasks
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {[
              { title: 'In Progress', tasks: inProgressTasks, status: 'In Progress', color: 'blue' },
              { title: 'Pending', tasks: pendingTasks, status: 'Pending', color: 'slate' },
              { title: 'Completed', tasks: completedTasks, status: 'Done', color: 'emerald' }
            ].map(section => (
              <div key={section.status}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    {section.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold bg-${section.color}-100 text-${section.color}-700`}>
                    {section.tasks.length}
                  </span>
                </div>

                {section.tasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No {section.title.toLowerCase()} tasks
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.tasks.map(task => {
                      const StatusIcon = getStatusIcon(task.taskStatus || 'Pending');
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.taskStatus !== 'Done';

                      return (
                        <div
                          key={task.id}
                          className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(task.taskStatus || 'Pending')}`} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-slate-900 text-sm">
                                  {task.summary}
                                </h4>
                                {task.priority && (
                                  <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                )}
                              </div>

                              {task.details && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                  {task.details}
                                </p>
                              )}

                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                {task.dueDate && (
                                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.dueDate), 'MMM d')}
                                  </div>
                                )}
                                {viewMode === 'team' && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {getUserName(task.assignedToId)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {task.taskStatus !== 'Done' && (
                                <>
                                  {task.taskStatus === 'Pending' && (
                                    <button
                                      onClick={() => handleStatusChange(task.id, 'In Progress')}
                                      className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                    >
                                      Start
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleStatusChange(task.id, 'Done')}
                                    className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                  >
                                    Complete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            Total Tasks: <span className="font-bold text-slate-900">{displayTasks.length}</span>
          </div>
          <div className="text-sm text-slate-600">
            Completion Rate: <span className="font-bold text-emerald-600">
              {displayTasks.length > 0 ? Math.round((completedTasks.length / displayTasks.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
