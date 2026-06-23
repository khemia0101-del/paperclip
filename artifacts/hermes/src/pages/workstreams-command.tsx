import { useEffect, useState } from "react";
import { api, type Workstream } from "@/lib/command-center-api";

export default function Workstreams() {
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  useEffect(() => { api<Workstream[]>("/workstreams").then(setWorkstreams); }, []);
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Workstreams</h1><p className="text-sm text-muted-foreground">Long-running efforts with next actions and linked agent work.</p></div><div className="grid md:grid-cols-2 gap-3">{workstreams.map((w) => <div key={w.id} className="rounded border border-border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{w.name}</h2><span className="text-xs text-primary">{w.priority}</span></div><p className="text-xs text-muted-foreground mt-1">{w.category} · {w.status}</p><p className="mt-3 text-sm">{w.nextAction || "No next action set."}</p></div>)}</div></div>;
}
