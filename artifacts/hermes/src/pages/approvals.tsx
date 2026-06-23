import { useEffect, useState } from "react";
import { api, type Approval, fmtDate } from "@/lib/command-center-api";
import { Button } from "@/components/ui/button";

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  async function refresh() { setApprovals(await api<Approval[]>("/approvals")); }
  useEffect(() => { refresh(); }, []);
  async function decide(id: number, status: "approved" | "rejected") { await api(`/approvals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await refresh(); }
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Approvals</h1><p className="text-sm text-muted-foreground">Review side effects before Paperclip sends, edits, schedules, uploads, or pushes anything.</p></div>{approvals.map((a) => <div key={a.id} className={`rounded border p-4 space-y-3 ${a.status === "pending" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}><div className="flex flex-col md:flex-row md:items-center justify-between gap-2"><div><h2 className="font-semibold">{a.title}</h2><p className="text-xs text-muted-foreground">{a.actionType} · {fmtDate(a.createdAt)}</p></div><span className="text-xs text-primary">{a.status}</span></div><pre className="max-h-44 overflow-auto rounded bg-background p-3 text-xs whitespace-pre-wrap">{JSON.stringify(a.payload, null, 2)}</pre>{a.status === "pending" && <div className="flex gap-2"><Button onClick={() => decide(a.id, "approved")}>Approve</Button><Button variant="outline" onClick={() => decide(a.id, "rejected")}>Reject</Button></div>}</div>)}</div>;
}
