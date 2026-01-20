import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  summary: string;
  is_completed: boolean;
  due_date: string | null;
  assigned_to: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface DealTasksProps {
  entityId: string;
}

export function DealTasks({ entityId }: DealTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskSummary, setNewTaskSummary] = useState("");
  const [adding, setAdding] = useState(false);

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
          is_completed,
          due_date,
          assigned_to,
          priority,
          assignee:assigned_to(id, full_name, avatar_url)
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

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("activities")
        .update({ is_completed: !currentStatus })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, is_completed: !currentStatus } : task
        )
      );

      toast.success(!currentStatus ? "Task completed" : "Task reopened");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskSummary.trim()) return;

    try {
      setAdding(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newTask, error } = await supabase
        .from("activities")
        .insert({
          activity_type: "task",
          summary: newTaskSummary.trim(),
          is_task: true,
          is_completed: false,
          related_to_id: entityId,
          created_by: user.id,
          assigned_to: user.id,
          priority: "medium",
        })
        .select(
          `
          id,
          summary,
          is_completed,
          due_date,
          assigned_to,
          priority,
          assignee:assigned_to(id, full_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;

      setTasks((prev) => [...prev, newTask]);
      setNewTaskSummary("");
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

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getDueDateBadge = (dueDate: string | null, isCompleted: boolean) => {
    if (!dueDate || isCompleted) return null;

    const date = new Date(dueDate);
    const overdue = isPast(date) && !isToday(date);

    let label = format(date, "MMM d");
    let colorClass = "bg-gray-100 text-gray-600";

    if (overdue) {
      label = "Overdue";
      colorClass = "bg-red-100 text-red-700";
    } else if (isToday(date)) {
      label = "Today";
      colorClass = "bg-emerald-100 text-emerald-700";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
      colorClass = "bg-blue-100 text-blue-700";
    }

    return (
      <Badge variant="outline" className={`text-xs ${colorClass} border-0`}>
        <Calendar className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Add Task */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTaskSummary}
          onChange={(e) => setNewTaskSummary(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1"
        />
        <Button
          onClick={handleAddTask}
          disabled={adding || !newTaskSummary.trim()}
          size="sm"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-sm font-medium">No tasks yet</div>
          <div className="text-xs mt-1">Add your first task above</div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                task.is_completed
                  ? "bg-gray-50 border-gray-200"
                  : "bg-card border-gray-200 hover:bg-accent/50"
              }`}
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={() => handleToggleComplete(task.id, task.is_completed)}
              />

              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${
                    task.is_completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.summary}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.priority && !task.is_completed && (
                  <Badge
                    variant="outline"
                    className={`text-xs border ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority.toUpperCase()}
                  </Badge>
                )}

                {getDueDateBadge(task.due_date, task.is_completed)}

                {task.assignee && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                      {task.assignee.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
