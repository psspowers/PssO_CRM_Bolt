import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckSquare, Square, Loader2, Hand, Search, Plus, Calendar, Check, X, User, ChevronRight, Reply, Filter, Users, ChevronDown, ThumbsUp, CornerDownRight, MessageSquare, ListPlus } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterModal } from '../crm/FilterModal';

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
  assignee_role?: string;
  parent_task_id?: string;
  depth: number;
  created_at: string;
  children?: TaskThread[];
  isOptimistic?: boolean;
  reactions?: Record<string, string>;
  comment_count?: number;
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
  const configs: Record<string, { char: string; color: string; bg: string; borderColor: string; hollow?: boolean }> = {
    'Prospect': { char: '', color: 'text-slate-500', bg: 'bg-white', borderColor: 'border-slate-400', hollow: true },
    'Qualified': { char: 'Q', color: 'text-blue-600', bg: 'bg-blue-100', borderColor: 'border-blue-500' },
    'Proposal': { char: 'P', color: 'text-amber-600', bg: 'bg-amber-100', borderColor: 'border-amber-500' },
    'Negotiation': { char: 'N', color: 'text-purple-600', bg: 'bg-purple-100', borderColor: 'border-purple-500' },
    'Term Sheet': { char: 'T', color: 'text-teal-600', bg: 'bg-teal-100', borderColor: 'border-teal-500' },
    'Won': { char: 'W', color: 'text-emerald-600', bg: 'bg-emerald-100', borderColor: 'border-emerald-500' },
  };
  const s = configs[stage] || { char: '?', color: 'text-slate-500', bg: 'bg-slate-100', borderColor: 'border-slate-300' };
  return (
    <div className={cn(
      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white border-[3px]',
      s.bg,
      s.color,
      s.borderColor
    )}>
      {s.char}
    </div>
  );
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

const getRoleBorderColor = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'border-red-500';
    case 'internal':
      return 'border-orange-500';
    case 'external':
      return 'border-gray-400';
    default:
      return 'border-slate-300';
  }
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
  const [showUserPicker, setShowUserPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(event.target as Node)) {
        setShowUserPicker(false);
      }
    };

    if (showUserPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserPicker]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [summary]);

  const handleSave = () => {
    if (summary.trim()) {
      onSave(summary, assigneeId, dueDate);
      setSummary('');
      setAssigneeId(currentUser?.id || '');
      setDueDate('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const selectedUser = users.find(u => u.id === assigneeId);
  const initials = selectedUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="relative group py-3"
    >
      <div className="absolute left-[22px] top-[-12px] bottom-[-12px] border-l-2 border-dotted border-slate-300 z-0" />

      <div className="relative z-10 pl-[42px] pr-2">
        <div className="flex items-start gap-2">
          <div ref={userPickerRef} className="relative flex-shrink-0">
            <button
              onClick={() => setShowUserPicker(!showUserPicker)}
              className="relative"
              title="Assign to user"
            >
              <Avatar className="w-5 h-5 ring-2 ring-white shadow-sm hover:ring-orange-500 transition-all">
                <AvatarImage src={selectedUser?.avatar_url} />
                <AvatarFallback className="bg-orange-500 text-white text-[9px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>

            {showUserPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
              >
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setAssigneeId(u.id);
                      setShowUserPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left",
                      assigneeId === u.id && "bg-orange-50"
                    )}
                  >
                    <Avatar className={cn("w-6 h-6 ring-2 ring-white border-2", getRoleBorderColor(u.role))}>
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-slate-100 text-[9px] text-slate-600">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 truncate">{u.name}</span>
                    {assigneeId === u.id && <Check className="w-4 h-4 text-orange-600 ml-auto" />}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isReply ? "Type reply..." : "Type task..."}
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-[13px] text-slate-700 font-normal placeholder:text-slate-400 leading-relaxed overflow-hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 ml-7">
          <div className="relative">
            {dueDate ? (
              <button
                onClick={() => document.getElementById(`date-picker-${depth}`)?.click()}
                className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-md hover:bg-yellow-200 transition-colors"
              >
                {format(parseISO(dueDate), 'MMM d')}
              </button>
            ) : (
              <button
                onClick={() => document.getElementById(`date-picker-${depth}`)?.click()}
                className="text-slate-400 hover:text-orange-500 transition-colors"
                title="Set due date"
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}
            <input
              id={`date-picker-${depth}`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={handleSave}
            disabled={!summary.trim()}
            className={cn(
              "text-xs font-bold px-3 py-1 rounded-md transition-colors",
              summary.trim()
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
            title="Post"
          >
            Post
          </button>
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
  onLike,
  currentUserId,
  users,
  addingChildTo,
  addingReplyTo,
  onSaveTask,
  onCancelTask,
  expandedTasks,
  onToggleExpand,
  editingTaskId,
  editingSummary,
  editingAssignee,
  editingDueDate,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditSummaryChange,
  onEditAssigneeChange,
  onEditDueDateChange,
}: {
  task: TaskThread;
  dealId: string;
  depth: number;
  onComplete: (id: string, status?: string) => void;
  onPickup: (id: string) => void;
  onAddChild: (taskId: string) => void;
  onAddReply: (taskId: string) => void;
  onLike: (id: string, userId: string) => void;
  currentUserId?: string;
  users: any[];
  addingChildTo: string | null;
  addingReplyTo: string | null;
  onSaveTask: (summary: string, assignee: string, date: string, parentId?: string, isReply?: boolean) => void;
  onCancelTask: () => void;
  expandedTasks: Set<string>;
  onToggleExpand: (id: string) => void;
  editingTaskId: string | null;
  editingSummary: string;
  editingAssignee: string;
  editingDueDate: string;
  onStartEdit: (task: TaskThread) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditSummaryChange: (value: string) => void;
  onEditAssigneeChange: (value: string) => void;
  onEditDueDateChange: (value: string) => void;
}) => {
  const isCompleted = task.task_status === 'Completed';
  const isMine = task.assigned_to_id === currentUserId;
  const isUnassigned = !task.assigned_to_id;
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expandedTasks.has(task.id);
  const isAddingChild = addingChildTo === task.id;
  const isAddingReply = addingReplyTo === task.id;
  const isEditing = editingTaskId === task.id;
  const hasLiked = currentUserId && task.reactions?.[currentUserId] === 'like';
  const likeCount = task.reactions ? Object.keys(task.reactions).length : 0;

  const avatarSize = 'w-7 h-7';
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    if (isCompleted) return;
    longPressTimerRef.current = setTimeout(() => {
      onStartEdit(task);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (isCompleted) return;
    onStartEdit(task);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  if (task.isOptimistic) {
    return (
      <div className="relative group py-3">
        <div className="absolute left-[24px] top-[-12px] bottom-[-12px] border-l-2 border-dotted border-slate-300 z-0" />
        <div className="relative z-10 pl-[36px] pr-2">
          <div className="absolute left-[17px] top-[16px] z-20 bg-white">
            <div className="w-4 h-4 rounded-full border-2 border-slate-300 animate-pulse" />
          </div>
          <div className="flex items-start gap-2">
            <Avatar className={cn("w-5 h-5 ring-2 ring-white shadow-sm animate-pulse flex-shrink-0 border-2", getRoleBorderColor(task.assignee_role))}>
              <AvatarImage src={task.assignee_avatar} />
              <AvatarFallback className="bg-slate-100 text-[8px] text-slate-600">
                {getInitials(task.assignee_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <p className="text-[13px] font-normal text-slate-600">{task.summary}</p>
              <Loader2 className="w-3 h-3 animate-spin text-orange-500 flex-shrink-0" />
              <span className="text-[10px] text-slate-400">Saving...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = users.find(u => u.id === currentUserId);

  if (isEditing) {
    const selectedUser = users.find(u => u.id === editingAssignee);
    const initials = selectedUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';

    return (
      <div className="relative group py-3">
        <div className="absolute left-[22px] top-[-12px] bottom-[-12px] border-l-2 border-dotted border-slate-300 z-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 pl-[42px] pr-2"
        >
          <div className="absolute left-[15px] top-[10px] z-20 bg-white">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-500" />
          </div>

          <div className="flex items-start gap-2">
            <div className="relative flex-shrink-0">
              <select
                value={editingAssignee}
                onChange={e => onEditAssigneeChange(e.target.value)}
                className="appearance-none bg-transparent outline-none cursor-pointer opacity-0 absolute inset-0 w-5 h-5 z-10"
                title="Change assignee"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold pointer-events-none ring-2 ring-white shadow-sm">
                {initials}
              </div>
            </div>

            <div className="flex-1 bg-white border-2 border-orange-300 rounded-lg shadow-md">
              <input
                value={editingSummary}
                onChange={(e) => onEditSummaryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                placeholder="Task summary..."
                className="w-full bg-transparent outline-none text-[13px] font-normal py-2 px-2"
                autoFocus
              />
              <div className="flex items-center gap-2 px-2 pb-2 border-t border-orange-100 pt-2 mt-1">
                <input
                  type="date"
                  value={editingDueDate}
                  onChange={e => onEditDueDateChange(e.target.value)}
                  className="text-[11px] outline-none text-slate-600 cursor-pointer flex-1"
                />
                <button onClick={onCancelEdit} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button onClick={onSaveEdit} className="p-1 hover:bg-green-50 rounded text-green-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute left-[22px] top-[-12px] bottom-[-12px] border-l-2 border-dotted border-slate-300 group-hover:border-slate-400 transition-colors z-0" />

      <div
        className={cn(
          'relative z-10 py-3 transition-all',
          isCompleted && 'opacity-50 grayscale'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div className="absolute left-[15px] top-[10px] z-20 bg-white">
          <button
            onClick={() => onComplete(task.id, task.task_status)}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all hover:scale-110",
              isCompleted
                ? "bg-green-500 border-green-500"
                : "border-slate-300 hover:border-green-400"
            )}
          >
            {isCompleted && <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />}
          </button>
        </div>

        <div className="pl-[42px] pr-2">
          <div className="flex items-start gap-2">
            {isUnassigned ? (
              <button
                onClick={() => onPickup(task.id)}
                className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-white flex-shrink-0"
              >
                <Hand className="w-3 h-3 text-amber-600" />
              </button>
            ) : (
              <Avatar className={cn("w-5 h-5 ring-2 ring-white shadow-sm flex-shrink-0 border-2", getRoleBorderColor(task.assignee_role))}>
                <AvatarImage src={task.assignee_avatar} />
                <AvatarFallback className="bg-slate-100 text-[8px] text-slate-600">
                  {getInitials(task.assignee_name)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-[13px] leading-relaxed transition-all",
                  isMine ? "text-slate-900 font-normal" : "text-slate-700 font-normal",
                  isCompleted && "line-through decoration-slate-300"
                )}
              >
                {task.summary}
                {hasChildren && (
                  <>
                    {' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                      }}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 border border-slate-200 hover:scale-110 transition-transform"
                      title="Toggle subtasks"
                    >
                      <ChevronRight className={cn("w-2.5 h-2.5 text-slate-500 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                  </>
                )}
              </p>

              {!isCompleted && (
                <div className="flex items-center justify-between mt-2 ml-7 pr-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentUserId) {
                          onLike(task.id, currentUserId);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 transition-all",
                        hasLiked
                          ? "text-blue-500 hover:text-blue-600"
                          : "text-slate-400 hover:text-blue-500 hover:scale-110"
                      )}
                      title={hasLiked ? "Unlike" : "Like"}
                    >
                      <ThumbsUp className={cn("w-4 h-4", hasLiked && "fill-blue-500")} />
                      {likeCount > 0 && (
                        <span className="text-[10px] font-bold">{likeCount}</span>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddReply(task.id);
                      }}
                      className="text-slate-400 hover:text-green-500 transition-colors"
                      title="Comment"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(task.id);
                      }}
                      className="text-slate-400 hover:text-orange-500 transition-colors"
                      title="Add subtask"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddReply(task.id);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Reply"
                    >
                      <CornerDownRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center">
                    {task.due_date && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md",
                        isOverdue
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      )}>
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <div className="ml-6">
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
                onLike={onLike}
                currentUserId={currentUserId}
                users={users}
                addingChildTo={addingChildTo}
                addingReplyTo={addingReplyTo}
                onSaveTask={onSaveTask}
                onCancelTask={onCancelTask}
                expandedTasks={expandedTasks}
                onToggleExpand={onToggleExpand}
                editingTaskId={editingTaskId}
                editingSummary={editingSummary}
                editingAssignee={editingAssignee}
                editingDueDate={editingDueDate}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onEditSummaryChange={onEditSummaryChange}
                onEditAssigneeChange={onEditAssigneeChange}
                onEditDueDateChange={onEditDueDateChange}
              />
            ))}
          </div>
        )}

        {(isAddingChild || isAddingReply) && (
          <div className="ml-6">
            <InlineTaskEditor
              users={users}
              currentUser={currentUser}
              onSave={(s, a, d) => onSaveTask(s, a, d, task.id, isAddingReply)}
              onCancel={onCancelTask}
              depth={depth + 1}
              isReply={isAddingReply}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

type Tab = 'home' | 'accounts' | 'opportunities' | 'partners' | 'contacts' | 'search' | 'timeline' | 'tasks' | 'projects' | 'pulse' | 'me' | 'nexus';

interface TasksScreenProps {
  onNavigate?: (tab: Tab, id?: string) => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { users } = useAppContext();
  const [dealGroups, setDealGroups] = useState<DealGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');

  const [addingRootTo, setAddingRootTo] = useState<string | null>(null);
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
  const [addingReplyTo, setAddingReplyTo] = useState<string | null>(null);

  const [optimisticTasks, setOptimisticTasks] = useState<Map<string, TaskThread>>(new Map());

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState('');
  const [editingAssignee, setEditingAssignee] = useState('');
  const [editingDueDate, setEditingDueDate] = useState('');

  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!user?.id) return;

    const fetchSubordinates = async () => {
      setLoadingSubordinates(true);
      try {
        const { data, error } = await supabase
          .from('user_hierarchy')
          .select('subordinate_id')
          .eq('manager_id', user.id);

        if (error) {
          console.error('Error fetching subordinates:', error);
          setSubordinateIds([]);
        } else {
          const ids = data?.map(row => row.subordinate_id) || [];
          setSubordinateIds(ids);
        }
      } catch (err) {
        console.error('Failed to fetch subordinates:', err);
        setSubordinateIds([]);
      } finally {
        setLoadingSubordinates(false);
      }
    };

    fetchSubordinates();
  }, [user?.id]);

  useEffect(() => {
    if (hierarchyView === 'mine') setSelectedMemberId('all');
  }, [hierarchyView]);

  const teamMembers = useMemo(() => {
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      return users.filter(u => ['internal', 'admin', 'super_admin'].includes(u.role));
    } else {
      return users.filter(u => subordinateIds.includes(u.id) || u.id === user?.id);
    }
  }, [users, subordinateIds, profile, user]);

  const formatShortName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

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

  const handleLike = async (taskId: string, userId: string) => {
    try {
      const { data: currentTask, error: fetchError } = await supabase
        .from('activities')
        .select('reactions')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      const reactions = currentTask?.reactions || {};
      const newReactions = { ...reactions };

      if (newReactions[userId] === 'like') {
        delete newReactions[userId];
      } else {
        newReactions[userId] = 'like';
      }

      const { error: updateError } = await supabase
        .from('activities')
        .update({ reactions: newReactions })
        .eq('id', taskId);

      if (updateError) throw updateError;

      setDealGroups(prevGroups => {
        return prevGroups.map(group => {
          const updateReactions = (tasks: TaskThread[]): TaskThread[] => {
            return tasks.map(task => {
              if (task.id === taskId) {
                return { ...task, reactions: newReactions };
              }
              return {
                ...task,
                children: task.children ? updateReactions(task.children) : []
              };
            });
          };
          return { ...group, tasks: updateReactions(group.tasks || []) };
        });
      });
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast({ title: 'Error', description: 'Failed to update reaction', variant: 'destructive' });
    }
  };

  const handleStartEdit = (task: TaskThread) => {
    setEditingTaskId(task.id);
    setEditingSummary(task.summary);
    setEditingAssignee(task.assigned_to_id || '');
    setEditingDueDate(task.due_date ? format(parseISO(task.due_date), 'yyyy-MM-dd') : '');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingSummary('');
    setEditingAssignee('');
    setEditingDueDate('');
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingSummary.trim()) return;

    try {
      const updateData: any = {
        summary: editingSummary.trim(),
        assigned_to_id: editingAssignee || null,
      };

      if (editingDueDate) {
        updateData.due_date = new Date(editingDueDate).toISOString();
      } else {
        updateData.due_date = null;
      }

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', editingTaskId);

      if (error) throw error;

      toast({ title: 'Task Updated' });
      handleCancelEdit();
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveNewTask = async (
    summary: string,
    assignee: string,
    date: string,
    parentId?: string,
    isReply?: boolean
  ) => {
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;

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

      const assignedUser = users.find(u => u.id === assignee);
      const optimisticTask: TaskThread = {
        id: optimisticId,
        summary,
        task_status: 'Pending',
        priority: 'Medium',
        due_date: date ? new Date(date).toISOString() : undefined,
        assigned_to_id: assignee,
        assignee_name: assignedUser?.name,
        assignee_avatar: assignedUser?.avatar_url,
        parent_task_id: parentId,
        depth: parentId ? 1 : 0,
        created_at: new Date().toISOString(),
        children: [],
        isOptimistic: true,
      };

      setOptimisticTasks(prev => new Map(prev).set(optimisticId, { ...optimisticTask, dealId: targetDealId }));

      setDealGroups(prevGroups => {
        return prevGroups.map(group => {
          if (group.id !== targetDealId) return group;

          const tasks = group.tasks || [];

          if (!parentId) {
            return { ...group, tasks: [...tasks, optimisticTask] };
          } else {
            const insertIntoParent = (taskList: TaskThread[]): TaskThread[] => {
              return taskList.map(task => {
                if (task.id === parentId) {
                  return {
                    ...task,
                    children: [...(task.children || []), optimisticTask],
                  };
                } else if (task.children && task.children.length > 0) {
                  return {
                    ...task,
                    children: insertIntoParent(task.children),
                  };
                }
                return task;
              });
            };
            return { ...group, tasks: insertIntoParent(tasks) };
          }
        });
      });

      if (parentId) {
        setExpandedTasks(prev => new Set(prev).add(parentId));
      }

      setAddingRootTo(null);
      setAddingChildTo(null);
      setAddingReplyTo(null);

      const payload: any = {
        summary,
        is_task: true,
        task_status: 'Pending',
        created_by_id: user?.id,
        assigned_to_id: assignee,
        related_to_id: parentId || targetDealId,
        related_to_type: parentId ? 'Activity' : 'Opportunity',
      };

      if (parentId) {
        payload.parent_task_id = parentId;
      }

      if (date) {
        payload.due_date = new Date(date).toISOString();
      }

      const { error } = await supabase.from('activities').insert(payload);

      if (error) throw error;

      setOptimisticTasks(prev => {
        const next = new Map(prev);
        next.delete(optimisticId);
        return next;
      });

      toast({ title: 'Task Created' });
      fetchTasks();
    } catch (err: any) {
      console.error(err);

      setOptimisticTasks(prev => {
        const next = new Map(prev);
        next.delete(optimisticId);
        return next;
      });

      setDealGroups(prevGroups => {
        return prevGroups.map(group => {
          const removeOptimistic = (tasks: TaskThread[]): TaskThread[] => {
            return tasks
              .filter(t => t.id !== optimisticId)
              .map(t => ({
                ...t,
                children: t.children ? removeOptimistic(t.children) : [],
              }));
          };
          return { ...group, tasks: removeOptimistic(group.tasks || []) };
        });
      });

      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filterTasks = (tasks: TaskThread[]): TaskThread[] => {
    if (!hideCompleted) return tasks;
    return tasks
      .filter(t => t.task_status !== 'Completed')
      .map(t => ({ ...t, children: t.children ? filterTasks(t.children) : [] }));
  };

  const myTasksCount = useMemo(() => {
    let count = 0;
    dealGroups.forEach(group => {
      (group.tasks || []).forEach(task => {
        const countTask = (t: TaskThread) => {
          if (hideCompleted && t.task_status === 'Completed') {
            (t.children || []).forEach(countTask);
            return;
          }
          if (t.assigned_to_id === user?.id) count++;
          (t.children || []).forEach(countTask);
        };
        countTask(task);
      });
    });
    return count;
  }, [dealGroups, user, hideCompleted]);

  const teamTasksCount = useMemo(() => {
    let count = 0;
    dealGroups.forEach(group => {
      (group.tasks || []).forEach(task => {
        const countTask = (t: TaskThread) => {
          if (hideCompleted && t.task_status === 'Completed') {
            (t.children || []).forEach(countTask);
            return;
          }

          const isMyTask = t.assigned_to_id === user?.id;
          const isSubordinateTask = subordinateIds.includes(t.assigned_to_id || '');

          if (isAdmin) {
            if (!isMyTask) count++;
          } else {
            if (isSubordinateTask && !isMyTask) count++;
          }
          (t.children || []).forEach(countTask);
        };
        countTask(task);
      });
    });
    return count;
  }, [dealGroups, subordinateIds, isAdmin, user, hideCompleted]);

  const displayGroups = useMemo(() => {
    const isSearching = search.trim().length > 0;

    return dealGroups
      .map(group => {
        let tasks = group.tasks || [];

        if (filterStage !== 'all' && group.stage !== filterStage) {
          return { ...group, tasks: [] };
        }

        if (filterPriority !== 'all') {
          const filterByPriority = (taskList: TaskThread[]): TaskThread[] => {
            return taskList
              .filter(t => t.priority === filterPriority)
              .map(t => ({
                ...t,
                children: t.children ? filterByPriority(t.children) : []
              }));
          };
          tasks = filterByPriority(tasks);
        }

        if (!isSearching && hierarchyView === 'mine') {
          const collectMyTasks = (taskList: TaskThread[]): TaskThread[] => {
            const result: TaskThread[] = [];

            for (const task of taskList) {
              if (task.assigned_to_id === user?.id) {
                result.push({
                  ...task,
                  children: task.children ? collectMyTasks(task.children) : []
                });
              } else if (task.children && task.children.length > 0) {
                const myChildTasks = collectMyTasks(task.children);
                result.push(...myChildTasks);
              }
            }

            return result;
          };

          tasks = collectMyTasks(tasks);
        } else if (hierarchyView === 'team') {
          if (selectedMemberId !== 'all') {
            const collectMemberTasks = (taskList: TaskThread[]): TaskThread[] => {
              const result: TaskThread[] = [];

              for (const task of taskList) {
                if (task.assigned_to_id === selectedMemberId) {
                  result.push({
                    ...task,
                    children: task.children ? collectMemberTasks(task.children) : []
                  });
                } else if (task.children && task.children.length > 0) {
                  const memberChildTasks = collectMemberTasks(task.children);
                  result.push(...memberChildTasks);
                }
              }

              return result;
            };

            tasks = collectMemberTasks(tasks);
          } else {
            const collectTeamTasks = (taskList: TaskThread[]): TaskThread[] => {
              const result: TaskThread[] = [];

              for (const task of taskList) {
                const isMyTask = task.assigned_to_id === user?.id;
                const isSubordinateTask = subordinateIds.includes(task.assigned_to_id || '');
                const isTeamTask = isAdmin ? (task.assigned_to_id !== user?.id) : isSubordinateTask;

                if (isTeamTask && !isMyTask) {
                  result.push({
                    ...task,
                    children: task.children ? collectTeamTasks(task.children) : []
                  });
                } else if (task.children && task.children.length > 0) {
                  const teamChildTasks = collectTeamTasks(task.children);
                  result.push(...teamChildTasks);
                }
              }

              return result;
            };

            tasks = collectTeamTasks(tasks);
          }
        } else if (isSearching) {
          const filterByAccess = (t: TaskThread): boolean => {
            const isMyTask = t.assigned_to_id === user?.id;
            const isSubordinateTask = subordinateIds.includes(t.assigned_to_id || '');
            if (!isAdmin && !isMyTask && !isSubordinateTask) {
              const filteredChildren = (t.children || []).filter(filterByAccess);
              return filteredChildren.length > 0;
            }
            return true;
          };
          tasks = tasks.filter(filterByAccess);
        }

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
      .filter(g => {
        if (g.tasks.length > 0) return true;
        if (search.trim() && g.name.toLowerCase().includes(search.toLowerCase())) return true;
        return false;
      });
  }, [dealGroups, hideCompleted, search, hierarchyView, selectedMemberId, subordinateIds, isAdmin, user?.id, filterPriority, filterStage]);

  const currentUser = users.find(u => u.id === user?.id);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>

          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className={cn(
                "p-2 bg-white border rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0",
                (filterPriority !== 'all' || filterStage !== 'all')
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <Filter className={cn(
                "w-5 h-5",
                (filterPriority !== 'all' || filterStage !== 'all') ? 'text-orange-600' : 'text-slate-600'
              )} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setHierarchyView('mine')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'mine'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mine</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {myTasksCount}
                </span>
              </button>
              <button
                onClick={() => setHierarchyView('team')}
                disabled={loadingSubordinates}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'team'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                } ${loadingSubordinates ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Team</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {loadingSubordinates ? '...' : teamTasksCount}
                </span>
              </button>
            </div>

            {hierarchyView === 'team' && (
              <div className="relative flex-shrink-0 animate-in fade-in slide-in-from-left-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-700 text-xs font-bold pl-2 pr-6 py-1.5 rounded-full border-none focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none w-28 truncate"
                >
                  <option value="all">All Team</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{formatShortName(m.name)}</option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-xs font-medium text-slate-600">Hide Done</span>
          </label>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {displayGroups.map((group) => {
          const isExpanded = expandedDeals.has(group.id);
          const taskTree = buildTaskTree(group.tasks || []);
          const isAddingRoot = addingRootTo === group.id;

          return (
            <div key={group.id} className="bg-white">
              <div
                onClick={() => handleToggleDeal(group.id)}
                className="flex items-center gap-3 pl-1 cursor-pointer hover:bg-slate-50 transition-colors py-2 rounded-lg"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.('opportunities', group.id);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {getStageAvatar(group.stage)}
                </div>
                <span className="font-bold text-slate-900 text-sm truncate flex-1 min-w-0">{group.name}</span>
                {group.mw > 0 && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mr-2">
                    {group.mw} MW
                  </span>
                )}
                <ChevronRight
                  className={cn("w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-auto mr-2", isExpanded && "rotate-90")}
                />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-6 mt-1"
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
                        onLike={handleLike}
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
                        editingTaskId={editingTaskId}
                        editingSummary={editingSummary}
                        editingAssignee={editingAssignee}
                        editingDueDate={editingDueDate}
                        onStartEdit={handleStartEdit}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onEditSummaryChange={setEditingSummary}
                        onEditAssigneeChange={setEditingAssignee}
                        onEditDueDateChange={setEditingDueDate}
                      />
                    ))}

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

                    {!isAddingRoot && (
                      <div className="relative group py-3">
                        <div className="absolute left-[24px] top-[-12px] bottom-[-12px] border-l-2 border-dotted border-slate-300 group-hover:border-orange-400 transition-colors z-0" />
                        <div className="relative z-10 pl-[36px]">
                          <button
                            onClick={() => {
                              setAddingRootTo(group.id);
                              setAddingChildTo(null);
                              setAddingReplyTo(null);
                            }}
                            className="absolute left-[17px] top-[-4px] w-4 h-4 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center hover:scale-125 active:scale-90 transition-transform shadow-md z-20"
                            title="Add task"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
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

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Tasks"
        filters={[
          {
            name: 'Priority',
            options: [
              { label: 'All', value: 'all' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' },
            ],
            selected: filterPriority,
            onChange: setFilterPriority,
          },
          {
            name: 'Deal Stage',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Prospect', value: 'Prospect' },
              { label: 'Qualified', value: 'Qualified' },
              { label: 'Proposal', value: 'Proposal' },
              { label: 'Negotiation', value: 'Negotiation' },
              { label: 'Term Sheet', value: 'Term Sheet' },
              { label: 'Won', value: 'Won' },
            ],
            selected: filterStage,
            onChange: setFilterStage,
          },
        ]}
        onReset={() => {
          setFilterPriority('all');
          setFilterStage('all');
        }}
      />
    </div>
  );
};

export default TasksScreen;
