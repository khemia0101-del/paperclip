import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/command-center-api";

type Job = { id: number; externalId?: string | null; name: string; status: string; schedule?: string | null; nextRunAt?: string | null; lastRunAt?: string | null; lastOutput?: string | null };
export default function ScheduledJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { api<Job[]>("/scheduled-jobs").then(setJobs); }, []);
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Scheduled Jobs</h1><p className="text-sm text-muted-foreground">Track follow-up audits, recurring checks, and automation runs.</p></div>{jobs.map((j) => <div key={j.id} className="rounded border border-border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{j.name}</h2><span className="text-xs text-primary">{j.status}</span></div><p className="text-xs text-muted-foreground mt-1">{j.externalId} · {j.schedule}</p><p className="text-sm mt-2">Next run: {fmtDate(j.nextRunAt)} · Last run: {fmtDate(j.lastRunAt)}</p>{j.lastOutput && <pre className="mt-2 rounded bg-background p-2 text-xs whitespace-pre-wrap">{j.lastOutput}</pre>}</div>)}</div>;
}
