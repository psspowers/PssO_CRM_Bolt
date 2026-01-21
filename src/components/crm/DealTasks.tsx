import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Plus,
  Calendar,
  AlertCircle,
  Loader2,
  Flag,
  User,
  CheckCircle2
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Task {
  id: string;
  summary: string;
  task_status: string | null;
  due_date: string | null;
  assigned_to_id: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  assignee?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface DealTasksProps {
  entityId: string;
  entityType?: "Opportunity" | "Account" | "Project";
}

export function DealTasks({ entityId, entityType = "Opportunity" }: DealTasksProps) {
  const { createActivity, updateActivity, users } = useAppContext();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [summary, setSummary] = useState("");
  const [assigneeId, setAssigneeId] = useState(user?.id || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [entityId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activities")
        .select(
          `
          id,
          summary,
          task_status,
          due_date,
          assigned_to_id,
          priority,
          assignee:crm_users!activities_assigned_to_fkey(id, name, avatar)
        `
        )
        .eq("related_to_id", entityId)
        .eq("is_task", true)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string | null) => {
    try {
      const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";

      await updateActivity(taskId, { taskStatus: newStatus });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, task_status: newStatus } : task
        )
      );

      toast.success(newStatus === "Completed" ? "Task completed" : "Task reopened");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleAddTask = async () => {
    if (!summary.trim() || !user?.id) return;

    try {
      setAdding(true);

      await createActivity({
        type: "task",
        summary: summary.trim(),
        isTask: true,
        taskStatus: "Pending",
        priority: priority,
        assignedToId: assigneeId || user.id,
        dueDate: dueDate,
        relatedToId: entityId,
        relatedToType: entityType,
        createdById: user.id,
      });

      setSummary("");
      setPriority("medium");
      setDueDate(undefined);
      setAssigneeId(user.id);

      await fetchTasks();
      toast.success("Task added");
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  const cyclePriority = () => {
    setPriority((prev) => {
      if (prev === "low") return "medium";
      if (prev === "medium") return "high";
      return "low";
    });
  };

  const getPriorityIcon = () => {
    switch (priority) {
      case "high":
        return <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
      case "medium":
        return <Flag className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />;
      case "low":
        return <Flag className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const getPriorityColor = (taskPriority: Task["priority"]) => {
    switch (taskPriority) {
      case "urgent":
      case "high":
        return "text-red-600";
      case "medium":
        return "text-orange-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-slate-400";
    }
  };

  const getDueDateText = (dueDateStr: string | null, taskStatus: string | null) => {
    if (!dueDateStr || taskStatus === "Completed") return null;

    const date = new Date(dueDateStr);
    const overdue = isPast(date) && !isToday(date);

    if (overdue) return { text: "Overdue", color: "text-red-600 font-semibold" };
    if (isToday(date)) return { text: "Today", color: "text-emerald-600 font-semibold" };
    if (isTomorrow(date)) return { text: "Tomorrow", color: "text-blue-600" };
    return { text: format(date, "MMM d"), color: "text-slate-500" };
  };

  const selectedUser = users.find((u) => u.id === assigneeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rich Input Bar */}
      <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 ring-orange-500/10 transition-all">
        <input
          type="text"
          placeholder="Add a new task..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1 border-none focus:ring-0 text-sm placeholder:text-slate-400 bg-transparent outline-none px-2"
        />

        <div className="flex items-center gap-1">
          {/* Priority Toggle */}
          <button
            type="button"
            onClick={cyclePriority}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            title={`Priority: ${priority}`}
          >
            {getPriorityIcon()}
          </button>

          {/* Date Picker */}
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors ${
                  dueDate ? "text-orange-600" : "text-slate-400"
                }`}
                title="Set due date"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  setShowDatePicker(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Assignee Selector */}
          <Popover open={showAssignee} onOpenChange={setShowAssignee}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Assign to"
              >
                {selectedUser ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedUser.avatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                      {selectedUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-500 px-2 py-1">
                  Assign to
                </div>
                {users.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setAssigneeId(usr.id);
                      setShowAssignee(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                      assigneeId === usr.id ? "bg-orange-50" : ""
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={usr.avatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                        {usr.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700">
                      {usr.name}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleAddTask}
            disabled={adding || !summary.trim()}
            className="p-1.5 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Add task"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* High Density Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <div className="text-xs font-medium">No tasks yet</div>
        </div>
      ) : (
        <div className="space-y-0.5 mt-4">
          {tasks.map((task) => {
            const dueDateInfo = getDueDateText(task.due_date, task.task_status);
            const isCompleted = task.task_status === "Completed";

            return (
              <div
                key={task.id}
                className="group flex items-center gap-3 p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => handleToggleComplete(task.id, task.task_status)}
                  className="shrink-0"
                />

                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span
                    className={`text-sm text-slate-700 truncate ${
                      isCompleted ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {task.summary}
                  </span>

                  {task.priority && !isCompleted && (
                    <Flag
                      className={`w-3 h-3 shrink-0 ${getPriorityColor(task.priority)}`}
                    />
                  )}

                  {dueDateInfo && (
                    <span className={`text-[10px] shrink-0 ${dueDateInfo.color}`}>
                      {dueDateInfo.text}
                    </span>
                  )}
                </div>

                {task.assignee && (
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={task.assignee.avatar || undefined} />
                    <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                      {task.assignee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                {isCompleted && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
