import { useGetDashboardSummary, useListThreads, useListWorkflows } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, MessageSquare, Zap, Pin, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: threads, isLoading: threadsLoading } = useListThreads();
  const { data: workflows } = useListWorkflows();

  const pinned = threads?.filter((t) => t.pinned) ?? [];
  const recent = threads?.filter((t) => !t.pinned).slice(0, 5) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Hermes agent overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Threads"
          value={summaryLoading ? null : (summary?.totalThreads ?? 0)}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <StatCard
          label="Active Threads"
          value={summaryLoading ? null : (summary?.activeThreads ?? 0)}
          icon={<Activity className="w-4 h-4" />}
          highlight
        />
        <StatCard
          label="Total Messages"
          value={summaryLoading ? null : (summary?.totalMessages ?? 0)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Workflow breakdown */}
      {!summaryLoading && (summary?.workflowBreakdown?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            By Workflow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {summary?.workflowBreakdown.map((w) => (
              <Link key={w.workflowId} href={`/threads?workflowId=${w.workflowId}`}>
                <div
                  data-testid={`workflow-card-${w.workflowId}`}
                  className="flex items-center gap-3 p-3 rounded border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: w.color }}
                  />
                  <span className="text-sm font-medium flex-1 truncate">{w.workflowName}</span>
                  <span className="text-xs text-muted-foreground font-mono">{w.threadCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Threads */}
      {pinned.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pin className="w-3.5 h-3.5" /> Pinned
          </h2>
          <div className="space-y-2">
            {pinned.map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Threads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Threads
          </h2>
          <Link href="/threads" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {threadsLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded">
            No threads yet.{" "}
            <Link href="/threads" className="text-primary underline">
              Start one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded border bg-card flex flex-col gap-2 ${
        highlight ? "border-primary/40" : "border-border"
      }`}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`${highlight ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
      <div>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className={`text-2xl font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>
            {value}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ThreadRow({ thread }: { thread: { id: number; title: string; workflowColor?: string | null; workflowName?: string | null; status: string; lastMessage?: string | null; updatedAt: string } }) {
  return (
    <Link href={`/threads/${thread.id}`}>
      <div
        data-testid={`thread-row-${thread.id}`}
        className="flex items-center gap-3 p-3 rounded border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer group"
        style={{ borderLeft: `3px solid ${thread.workflowColor ?? "#374151"}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {thread.title}
          </p>
          {thread.lastMessage && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {thread.workflowName && (
            <span className="text-xs text-muted-foreground hidden sm:block">{thread.workflowName}</span>
          )}
          <StatusBadge status={thread.status} />
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "text-emerald-400",
    completed: "text-muted-foreground",
    archived: "text-muted-foreground",
  };
  return (
    <span className={`text-xs font-mono uppercase tracking-wide ${colors[status] ?? "text-muted-foreground"}`}>
      {status}
    </span>
  );
}
