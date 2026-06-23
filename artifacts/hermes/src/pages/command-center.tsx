import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api, type Agent, type AgentRun, type Approval, type Artifact, type Workstream, fmtDate } from "@/lib/command-center-api";
import { Button } from "@/components/ui/button";

type Overview = { agents: Agent[]; runs: AgentRun[]; approvals: Approval[]; artifacts: Artifact[]; workstreams: Workstream[]; jobs: Array<{ id: number; name: string; status: string; schedule?: string; nextRunAt?: string }> };

export default function CommandCenter() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Overview>("/command-center/overview").then(setOverview).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!overview) return <div className="p-6 text-muted-foreground">Loading command center...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Act from Paperclip: launch tasks, pick agents, approve side effects, and find files.</p>
        </div>
        <Link href="/actions"><Button>Start Action</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Agents" value={overview.agents.length} />
        <Metric label="Workstreams" value={overview.workstreams.length} />
        <Metric label="Pending approvals" value={overview.approvals.length} highlight />
        <Metric label="Artifacts" value={overview.artifacts.length} />
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <Panel title="Active workstreams" href="/workstreams">
          {overview.workstreams.slice(0, 5).map((w) => (
            <div key={w.id} className="rounded border border-border p-3 bg-card">
              <div className="flex items-center justify-between gap-2"><b>{w.name}</b><span className="text-xs text-primary">{w.priority}</span></div>
              <p className="text-xs text-muted-foreground mt-1">{w.nextAction || "No next action set"}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Recent agent runs" href="/actions">
          {overview.runs.length === 0 ? <Empty text="No app-native task runs yet." /> : overview.runs.map((r) => (
            <div key={r.id} className="rounded border border-border p-3 bg-card">
              <div className="flex items-center justify-between gap-2"><b>{r.title}</b><Status value={r.status} /></div>
              <p className="text-xs text-muted-foreground mt-1">{fmtDate(r.createdAt)}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Approvals waiting" href="/approvals">
          {overview.approvals.length === 0 ? <Empty text="No approvals pending." /> : overview.approvals.map((a) => (
            <div key={a.id} className="rounded border border-amber-500/30 p-3 bg-amber-500/5">
              <b className="text-sm">{a.title}</b>
              <p className="text-xs text-muted-foreground mt-1">{a.actionType}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Scheduled jobs" href="/scheduled-jobs">
          {overview.jobs.map((j) => (
            <div key={j.id} className="rounded border border-border p-3 bg-card">
              <div className="flex items-center justify-between"><b>{j.name}</b><Status value={j.status} /></div>
              <p className="text-xs text-muted-foreground mt-1">Next: {fmtDate(j.nextRunAt)}</p>
            </div>
          ))}
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return <div className={`rounded border p-4 bg-card ${highlight ? "border-primary/40" : "border-border"}`}><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div></div>;
}
function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2><Link href={href} className="text-xs text-primary hover:underline">Open</Link></div>{children}</div>;
}
function Empty({ text }: { text: string }) { return <div className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">{text}</div>; }
function Status({ value }: { value: string }) { return <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-xs">{value}</span>; }
