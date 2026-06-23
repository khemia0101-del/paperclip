import { useEffect, useState } from "react";
import { api, type Agent, type Workstream, type AgentRun, fmtDate } from "@/lib/command-center-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Actions() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [title, setTitle] = useState("Check GPU donation replies and prepare next actions");
  const [prompt, setPrompt] = useState("Audit the GPU donation outreach workstream, check replies/bounces, update tracker notes, and draft follow-ups for approval.");
  const [agentId, setAgentId] = useState<number | undefined>();
  const [workstreamId, setWorkstreamId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [a, w, r] = await Promise.all([api<Agent[]>("/agents"), api<Workstream[]>("/workstreams"), api<AgentRun[]>("/agent-runs")]);
    setAgents(a); setWorkstreams(w); setRuns(r); setAgentId((v) => v ?? a[0]?.id); setWorkstreamId((v) => v ?? w[0]?.id);
  }
  useEffect(() => { refresh(); }, []);

  async function start() {
    setLoading(true);
    try {
      await api<AgentRun>("/agent-runs", { method: "POST", body: JSON.stringify({ title, prompt, agentId, workstreamId, mode: "approval_required" }) });
      await refresh();
    } finally { setLoading(false); }
  }

  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold">Actions</h1><p className="text-sm text-muted-foreground">Launch tasks from the app instead of Telegram.</p></div>
    <div className="rounded border border-border bg-card p-4 space-y-4">
      <div><label className="text-xs uppercase text-muted-foreground">Task title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label className="text-xs uppercase text-muted-foreground">Task prompt</label><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} /></div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm">Agent<select className="mt-1 w-full rounded border border-border bg-background p-2" value={agentId ?? ""} onChange={(e) => setAgentId(Number(e.target.value))}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.type}</option>)}</select></label>
        <label className="text-sm">Workstream<select className="mt-1 w-full rounded border border-border bg-background p-2" value={workstreamId ?? ""} onChange={(e) => setWorkstreamId(Number(e.target.value))}>{workstreams.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      </div>
      <Button onClick={start} disabled={loading || !title.trim() || !prompt.trim()}>{loading ? "Creating..." : "Create app-native task"}</Button>
    </div>
    <section className="space-y-3"><h2 className="font-semibold">Recent runs</h2>{runs.map((r) => <div key={r.id} className="rounded border border-border bg-card p-3"><div className="flex justify-between gap-3"><b>{r.title}</b><span className="text-xs text-primary">{r.status}</span></div><p className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p><p className="text-sm mt-2">{r.finalSummary || r.prompt}</p></div>)}</section>
  </div>;
}
