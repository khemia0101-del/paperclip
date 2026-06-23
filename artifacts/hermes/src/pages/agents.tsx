import { useEffect, useState } from "react";
import { api, type Agent } from "@/lib/command-center-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("custom");
  const [description, setDescription] = useState("");
  async function refresh() { setAgents(await api<Agent[]>("/agents")); }
  useEffect(() => { refresh(); }, []);
  async function addAgent() {
    if (!name.trim()) return;
    await api<Agent>("/agents", { method: "POST", body: JSON.stringify({ name, type, description }) });
    setName(""); setDescription(""); await refresh();
  }
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold">Agents</h1><p className="text-sm text-muted-foreground">Manage multiple agents and decide which one handles each task.</p></div>
    <div className="grid md:grid-cols-2 gap-3">{agents.map((agent) => <div key={agent.id} className="rounded border border-border bg-card p-4 space-y-3"><div className="flex items-center justify-between"><div><h2 className="font-semibold">{agent.name}</h2><p className="text-xs text-muted-foreground">{agent.slug} · {agent.type}</p></div><span className="rounded bg-primary/10 text-primary px-2 py-1 text-xs">{agent.status}</span></div><p className="text-sm text-muted-foreground">{agent.description}</p><div className="flex flex-wrap gap-1">{agent.capabilities?.map((c) => <span key={c.capability} className="rounded border border-border px-2 py-1 text-xs">{c.capability}</span>)}</div></div>)}</div>
    <div className="rounded border border-border bg-card p-4 space-y-3"><h2 className="font-semibold">Add agent profile</h2><Input placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} /><Input placeholder="Type: hermes, coding, research..." value={type} onChange={(e) => setType(e.target.value)} /><Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /><Button onClick={addAgent}>Add Agent</Button></div>
  </div>;
}
