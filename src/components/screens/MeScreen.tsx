import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wallet,
  Trophy,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  Flag,
  CheckCircle2,
  TrendingUp,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface MyStats {
  won_mw: number;
  quota_mw: number;
  commission: number;
  watts: number;
  pending_tasks: number;
}

interface Task {
  id: string;
  summary: string;
  task_status: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  related_to_type: string | null;
  related_to_id: string | null;
  opportunity?: { name: string } | null;
  account?: { name: string } | null;
  project?: { name: string } | null;
}

export function MeScreen() {
  const { profile } = useAuth();
  const { updateActivity } = useAppContext();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [showMoney, setShowMoney] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMyTasks();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_my_stats");

      if (error) throw error;
      setStats(data);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTasks = async () => {
    try {
      setTasksLoading(true);
      const { data, error } = await supabase
        .from("activities")
        .select(
          `
          id,
          summary,
          task_status,
          due_date,
          priority,
          related_to_type,
          related_to_id,
          opportunity:opportunities!activities_related_to_id_fkey(name),
          account:accounts!activities_related_to_id_fkey(name),
          project:projects!activities_related_to_id_fkey(name)
        `
        )
        .eq("assigned_to_id", profile?.id)
        .eq("is_task", true)
        .neq("task_status", "Completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      await updateActivity(taskId, { taskStatus: "Completed" });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast.success("Task completed");
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
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

  const getDueDateText = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;

    const date = new Date(dueDateStr);
    const overdue = isPast(date) && !isToday(date);

    if (overdue) return { text: "Overdue", color: "text-red-600 font-semibold" };
    if (isToday(date)) return { text: "Today", color: "text-emerald-600 font-semibold" };
    if (isTomorrow(date)) return { text: "Tomorrow", color: "text-blue-600" };
    return { text: format(date, "MMM d"), color: "text-slate-500" };
  };

  const getRelatedEntityName = (task: Task) => {
    if (task.related_to_type === "Opportunity" && task.opportunity) {
      return task.opportunity.name;
    }
    if (task.related_to_type === "Account" && task.account) {
      return task.account.name;
    }
    if (task.related_to_type === "Project" && task.project) {
      return task.project.name;
    }
    return null;
  };

  const quotaProgress = stats
    ? Math.min((stats.won_mw / stats.quota_mw) * 100, 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      {/* HERO CARD - Dark Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,138,76,0.1),transparent)]" />

        <div className="relative z-10 space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-white/20">
              <AvatarImage src={profile?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xl font-bold">
                {profile?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.name}</h1>
              <Badge
                variant="secondary"
                className="bg-orange-500/20 text-orange-300 border-orange-500/30"
              >
                <Trophy className="w-3 h-3 mr-1" />
                Rainmaker
              </Badge>
            </div>
          </div>

          {/* YTD Earnings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white/80">
                  YTD Earnings
                </span>
              </div>
              <button
                onClick={() => setShowMoney(!showMoney)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showMoney ? (
                  <EyeOff className="w-4 h-4 text-white/60" />
                ) : (
                  <Eye className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>

            <div className="text-3xl font-bold text-white">
              {showMoney ? (
                `฿${stats?.commission.toLocaleString() || "0"}`
              ) : (
                <span className="text-white/30">฿•••,•••</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-white/60">
              <TrendingUp className="w-3 h-3" />
              <span>
                Based on {stats?.won_mw.toFixed(2) || "0"} MW Closed
              </span>
            </div>
          </div>

          {/* Quota Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white/80">
                Quota Progress
              </span>
            </div>

            <Progress
              value={quotaProgress}
              className="h-3 bg-white/10"
              indicatorClassName="bg-gradient-to-r from-emerald-500 to-blue-500"
            />

            <div className="flex items-center justify-between text-xs text-white/60">
              <span>
                {stats?.won_mw.toFixed(2) || "0"} MW /{" "}
                {stats?.quota_mw.toFixed(2) || "0"} MW
              </span>
              <span className="font-semibold text-white">
                {quotaProgress.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WATTS CARD - Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200/50 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">
                Watts Balance
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.watts.toLocaleString() || "0"}{" "}
                <span className="text-base font-normal text-slate-500">W</span>
              </div>
            </div>
          </div>
          <Button disabled className="bg-slate-200 text-slate-400 cursor-not-allowed">
            Coming Soon
          </Button>
        </div>
      </div>

      {/* MY TASKS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              My Focus
            </h2>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              {stats?.pending_tasks || 0}
            </Badge>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <div className="text-sm font-medium">All caught up!</div>
              <div className="text-xs mt-1">No pending tasks</div>
            </div>
          ) : (
            tasks.map((task) => {
              const dueDateInfo = getDueDateText(task.due_date);
              const relatedEntity = getRelatedEntityName(task);

              return (
                <div
                  key={task.id}
                  className="group flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleToggleComplete(task.id)}
                    className="shrink-0 mt-0.5"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {task.summary}
                      </span>
                      {task.priority && (
                        <Flag
                          className={`w-3 h-3 shrink-0 ${getPriorityColor(
                            task.priority
                          )}`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {relatedEntity && (
                        <>
                          <span className="truncate">{relatedEntity}</span>
                          <span>•</span>
                        </>
                      )}
                      {dueDateInfo && (
                        <span className={dueDateInfo.color}>
                          {dueDateInfo.text}
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
    </div>
  );
}
