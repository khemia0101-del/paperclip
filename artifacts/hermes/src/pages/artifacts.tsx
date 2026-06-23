import { useEffect, useState } from "react";
import { api, type Artifact, fmtDate } from "@/lib/command-center-api";

export default function Artifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  useEffect(() => { api<Artifact[]>("/artifacts").then(setArtifacts); }, []);
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Artifacts</h1><p className="text-sm text-muted-foreground">PDFs, reports, CSVs, notes, task briefs, and verified output files.</p></div><div className="grid md:grid-cols-2 gap-3">{artifacts.map((a) => <div key={a.id} className="rounded border border-border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{a.title}</h2><span className="text-xs text-primary">{a.artifactType}</span></div><p className="text-xs text-muted-foreground mt-1">{fmtDate(a.createdAt)} · {a.verified ? "verified" : "unverified"}</p><code className="mt-3 block rounded bg-background p-2 text-xs break-all">{a.pathOrUrl}</code></div>)}</div></div>;
}
