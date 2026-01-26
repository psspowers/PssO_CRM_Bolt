import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Briefcase,
  ListTodo,
  Award,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow, getQuarter } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MyStats {
  won_mw: number;
  quota_mw: number;
  commission: number;
  watts: number;
  pending_tasks: number;
  rate: number;
}

interface Task {
  id: string;
  summary: string;
  task_status: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  related_to_type: string | null;
  related_to_id: string | null;
  details: string | null;
  entityName?: string | null;
}

interface Project {
  id: string;
  name: string;
  capacity: number | null;
  status: string | null;
  updated_at: string;
  linked_opportunity_id: string | null;
  opportunity: {
    id: string;
    name: string;
    target_capacity: number;
    stage: string;
    expected_close_date: string | null;
  } | null;
}

export function MeScreen() {
  const { profile } = useAuth();
  const { updateActivity } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [showMoney, setShowMoney] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  useEffect(() => {
    fetchStats();
    fetchMyTasks();
    fetchMyProjects();
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
          details
        `
        )
        .eq("assigned_to_id", profile?.id)
        .eq("is_task", true)
        .neq("task_status", "Completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tasksWithNames = await Promise.all(
        (data || []).map(async (task) => {
          let entityName = null;
          if (task.related_to_id && task.related_to_type) {
            try {
              if (task.related_to_type === "Opportunity") {
                const { data: opp } = await supabase
                  .from("opportunities")
                  .select("name")
                  .eq("id", task.related_to_id)
                  .maybeSingle();
                entityName = opp?.name;
              } else if (task.related_to_type === "Account") {
                const { data: acc } = await supabase
                  .from("accounts")
                  .select("name")
                  .eq("id", task.related_to_id)
                  .maybeSingle();
                entityName = acc?.name;
              } else if (task.related_to_type === "Project") {
                const { data: proj } = await supabase
                  .from("projects")
                  .select("name")
                  .eq("id", task.related_to_id)
                  .maybeSingle();
                entityName = proj?.name;
              }
            } catch (err) {
              console.error("Error fetching entity name:", err);
            }
          }

          return {
            ...task,
            entityName,
          };
        })
      );

      setTasks(tasksWithNames as any);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchMyProjects = async () => {
    try {
      setProjectsLoading(true);

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          capacity,
          status,
          updated_at,
          linked_opportunity_id,
          opportunity:linked_opportunity_id(id, name, target_capacity, stage, expected_close_date)
        `
        )
        .eq("owner_id", profile?.id)
        .order("updated_at", { ascending: false });

      if (projectsError) throw projectsError;

      const { data: earlyOpps, error: oppsError } = await supabase
        .from("opportunities")
        .select("id, name, target_capacity, stage, expected_close_date, updated_at")
        .eq("owner_id", profile?.id)
        .in("stage", ["Qualifying", "Qualified", "Proposal"])
        .order("updated_at", { ascending: false });

      if (oppsError) throw oppsError;

      const linkedOppIds = new Set(
        (projectsData || [])
          .map((p) => p.linked_opportunity_id)
          .filter(Boolean)
      );

      const mappedOpps = (earlyOpps || [])
        .filter((opp) => !linkedOppIds.has(opp.id))
        .map((opp) => ({
          id: opp.id,
          name: opp.name,
          capacity: opp.target_capacity,
          status: null,
          updated_at: opp.updated_at,
          linked_opportunity_id: opp.id,
          opportunity: {
            id: opp.id,
            name: opp.name,
            target_capacity: opp.target_capacity,
            stage: opp.stage,
            expected_close_date: opp.expected_close_date,
          },
        }));

      setProjects([...(projectsData || []), ...mappedOpps]);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
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

  const formatRewards = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`;
    }
    return amount.toFixed(0);
  };

  const calculateProjectCommission = (project: Project) => {
    if (!stats) return 0;
    const mw = project.opportunity?.target_capacity || project.capacity || 0;
    const rate = stats.rate || 0;
    return mw * rate;
  };

  const calculateTotalCommission = (projectsList: Project[]) => {
    return projectsList.reduce((total, project) => {
      return total + calculateProjectCommission(project);
    }, 0);
  };

  const calculateTotalMW = (projectsList: Project[]) => {
    return projectsList.reduce((total, project) => {
      return total + (project.opportunity?.target_capacity || project.capacity || 0);
    }, 0);
  };

  const getQuarterColor = (date: string | null): string => {
    if (!date) return "bg-slate-50";
    const quarter = getQuarter(new Date(date));
    const colors = {
      1: "bg-blue-50",
      2: "bg-emerald-50",
      3: "bg-amber-50",
      4: "bg-purple-50",
    };
    return colors[quarter as keyof typeof colors] || "bg-slate-50";
  };

  const advancedProjects = projects.filter((p) => {
    if (p.opportunity) {
      return ["Negotiation", "Contract Review", "Won"].includes(p.opportunity.stage);
    }
    return ["Permit/EPC", "Engineering", "Construction", "Operational", "Won"].includes(p.status || "");
  }).sort((a, b) => {
    const dateA = a.opportunity?.expected_close_date || a.updated_at;
    const dateB = b.opportunity?.expected_close_date || b.updated_at;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const earlyProjects = projects.filter((p) => {
    if (p.opportunity) {
      return ["Qualifying", "Qualified", "Proposal"].includes(p.opportunity.stage);
    }
    return false;
  }).sort((a, b) => {
    const dateA = a.opportunity?.expected_close_date || a.updated_at;
    const dateB = b.opportunity?.expected_close_date || b.updated_at;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,138,76,0.1),transparent)]" />

        <div className="relative z-10 space-y-6">
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
        </div>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-slate-500">
          <TabsTrigger
            value="tasks"
            className="w-full rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
          >
            <ListTodo className="w-4 h-4 mr-1.5" />
            <span>My Task</span>
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="w-full rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
          >
            <Briefcase className="w-4 h-4 mr-1.5" />
            <span>My Project</span>
          </TabsTrigger>
          <TabsTrigger
            value="rewards"
            className="w-full rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
          >
            <Award className="w-4 h-4 mr-1.5" />
            <span>My Rewards</span>
          </TabsTrigger>
        </TabsList>

        {/* MY TASKS TAB */}
        <TabsContent value="tasks" className="mt-4">
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20 overflow-hidden">
            <div className="p-3 border-b border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-blue-900">My Tasks</h2>
                <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                  {tasks.length}
                </Badge>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <div className="text-xs font-medium">All caught up!</div>
                </div>
              ) : (
                tasks.map((task) => {
                  const dueDateInfo = getDueDateText(task.due_date);

                  return (
                    <div
                      key={task.id}
                      className="group flex items-start gap-2 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleToggleComplete(task.id)}
                        className="shrink-0 mt-0.5"
                      />

                      <button
                        onClick={() => {
                          if (task.related_to_id && task.related_to_type === "Account") {
                            navigate("/", {
                              state: {
                                activeTab: "accounts",
                                detailId: task.related_to_id,
                              },
                            });
                          } else if (task.related_to_id && task.related_to_type === "Opportunity") {
                            navigate("/", {
                              state: {
                                activeTab: "opportunities",
                                detailId: task.related_to_id,
                              },
                            });
                          } else if (task.related_to_id && task.related_to_type === "Project") {
                            navigate("/", {
                              state: {
                                activeTab: "projects",
                                detailId: task.related_to_id,
                              },
                            });
                          }
                        }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-900 truncate">
                              {task.entityName || "No Deal"}
                            </span>
                            {task.priority && (
                              <Flag
                                className={`w-3 h-3 shrink-0 ${getPriorityColor(
                                  task.priority
                                )}`}
                              />
                            )}
                          </div>
                          <span className={`text-xs shrink-0 ${dueDateInfo ? dueDateInfo.color : 'text-slate-400'}`}>
                            {dueDateInfo ? dueDateInfo.text : 'No Date'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 line-clamp-1">
                          {task.summary || task.details}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* MY PROJECTS TAB */}
        <TabsContent value="projects" className="mt-4 space-y-4">
          {projectsLoading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20">
              <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <div className="text-sm font-medium">No active projects</div>
            </div>
          ) : (
            <>
              {/* ADVANCED STAGE PROJECTS */}
              {advancedProjects.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20 overflow-hidden">
                  <div className="p-3 border-b border-blue-200 bg-blue-50">
                    <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Negotiation & Above ({advancedProjects.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left font-semibold text-slate-600 px-3 py-2">
                            Deal Name
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            MW
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            Rewards
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            Due Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {advancedProjects.map((project) => {
                          const closeDate = project.opportunity?.expected_close_date || project.updated_at;
                          return (
                            <tr
                              key={project.id}
                              className={`hover:bg-slate-50 transition-colors ${getQuarterColor(closeDate)}`}
                            >
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => {
                                    if (project.linked_opportunity_id) {
                                      navigate("/", {
                                        state: {
                                          activeTab: "opportunities",
                                          detailId: project.linked_opportunity_id,
                                        },
                                      });
                                    }
                                  }}
                                  className="text-left text-slate-900 hover:text-orange-600 font-medium flex items-center gap-1 group"
                                >
                                  <span className="truncate max-w-[120px]">
                                    {project.opportunity?.name || project.name}
                                  </span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700 font-medium">
                                {(project.opportunity?.target_capacity || project.capacity || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700 font-medium">
                                {showMoney ? (
                                  `฿${formatRewards(calculateProjectCommission(project))}`
                                ) : (
                                  <span className="text-slate-400">฿•••</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-500">
                                {format(new Date(closeDate), "MMM d")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {calculateTotalMW(advancedProjects).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {showMoney ? (
                              `฿${formatRewards(calculateTotalCommission(advancedProjects))}`
                            ) : (
                              <span className="text-slate-400">฿•••</span>
                            )}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* EARLY STAGE PROJECTS */}
              {earlyProjects.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20 overflow-hidden">
                  <div className="p-3 border-b border-blue-200 bg-blue-50">
                    <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Qualifying & Proposal ({earlyProjects.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left font-semibold text-slate-600 px-3 py-2">
                            Deal Name
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            MW
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            Rewards
                          </th>
                          <th className="text-right font-semibold text-slate-600 px-3 py-2">
                            Due Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {earlyProjects.map((project) => {
                          const closeDate = project.opportunity?.expected_close_date || project.updated_at;
                          return (
                            <tr
                              key={project.id}
                              className={`hover:bg-slate-50 transition-colors ${getQuarterColor(closeDate)}`}
                            >
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => {
                                    if (project.linked_opportunity_id) {
                                      navigate("/", {
                                        state: {
                                          activeTab: "opportunities",
                                          detailId: project.linked_opportunity_id,
                                        },
                                      });
                                    }
                                  }}
                                  className="text-left text-slate-900 hover:text-orange-600 font-medium flex items-center gap-1 group"
                                >
                                  <span className="truncate max-w-[120px]">
                                    {project.opportunity?.name || project.name}
                                  </span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700 font-medium">
                                {(project.opportunity?.target_capacity || project.capacity || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700 font-medium">
                                {showMoney ? (
                                  `฿${formatRewards(calculateProjectCommission(project))}`
                                ) : (
                                  <span className="text-slate-400">฿•••</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-500">
                                {format(new Date(closeDate), "MMM d")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {calculateTotalMW(earlyProjects).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {showMoney ? (
                              `฿${formatRewards(calculateTotalCommission(earlyProjects))}`
                            ) : (
                              <span className="text-slate-400">฿•••</span>
                            )}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* MY REWARDS TAB */}
        <TabsContent value="rewards" className="mt-4 space-y-4">
          <div className="space-y-4 p-6 bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  YTD Earnings
                </span>
              </div>
              <button
                onClick={() => setShowMoney(!showMoney)}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showMoney ? (
                  <EyeOff className="w-4 h-4 text-blue-600" />
                ) : (
                  <Eye className="w-4 h-4 text-blue-600" />
                )}
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm p-6">
              <div className="text-3xl font-bold text-blue-900">
                {showMoney ? (
                  `฿${stats?.commission.toLocaleString() || "0"}`
                ) : (
                  <span className="text-blue-300">฿•••,•••</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-blue-700 mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>
                  Based on {stats?.won_mw.toFixed(2) || "0"} MW Closed
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Quota Progress
                </span>
              </div>

              <Progress
                value={quotaProgress}
                className="h-3 bg-blue-100"
              />

              <div className="flex items-center justify-between text-xs text-blue-700">
                <span>
                  {stats?.won_mw.toFixed(2) || "0"} MW /{" "}
                  {stats?.quota_mw.toFixed(2) || "0"} MW
                </span>
                <span className="font-semibold text-blue-900">
                  {quotaProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-700">
                      Watts Balance
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {stats?.watts.toLocaleString() || "0"}{" "}
                      <span className="text-base font-normal text-blue-600">W</span>
                    </div>
                  </div>
                </div>
                <Button disabled className="bg-blue-200 text-blue-500 cursor-not-allowed">
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
