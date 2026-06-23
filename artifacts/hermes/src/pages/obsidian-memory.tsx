import { useEffect, useState } from "react";
import { api, type VaultEntry } from "@/lib/command-center-api";
import { Button } from "@/components/ui/button";

type Source = "vault" | "memory";

export default function ObsidianMemory() {
  const [source, setSource] = useState<Source>("vault");
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [content, setContent] = useState<{ path: string; content: string } | null>(null);
  const listEndpoint = source === "vault" ? "/vault-files" : "/memory-files";
  const fileEndpoint = source === "vault" ? "/vault-file" : "/memory-file";
  async function load(p = path) { setEntries(await api<VaultEntry[]>(`${listEndpoint}?path=${encodeURIComponent(p)}`)); setPath(p); setContent(null); }
  async function open(entry: VaultEntry) { if (entry.type === "directory") return load(entry.path); setContent(await api<{ path: string; content: string }>(`${fileEndpoint}?path=${encodeURIComponent(entry.path)}`)); }
  useEffect(() => { load(""); }, [source]);
  const parent = path.split(/[\\/]/).slice(0, -1).join("/");
  return <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Obsidian & Memory</h1><p className="text-sm text-muted-foreground">Browse notes, trackers, and Hermes memory/skill files from Paperclip. Editing should remain approval-gated.</p></div><div className="flex gap-2"><Button variant={source === "vault" ? "default" : "outline"} onClick={() => setSource("vault")}>Obsidian Vault</Button><Button variant={source === "memory" ? "default" : "outline"} onClick={() => setSource("memory")}>Hermes Memory Files</Button></div><div className="grid md:grid-cols-[320px_1fr] gap-4"><div className="rounded border border-border bg-card p-3 space-y-2"><div className="flex items-center justify-between"><b className="text-sm">/{path}</b>{path && <button className="text-xs text-primary" onClick={() => load(parent)}>Up</button>}</div>{entries.map((e) => <button key={e.path} onClick={() => open(e)} className="block w-full text-left rounded px-2 py-2 hover:bg-muted text-sm"><span className="mr-2">{e.type === "directory" ? "📁" : "📄"}</span>{e.name}</button>)}</div><div className="rounded border border-border bg-card p-4 min-h-[480px] overflow-auto">{content ? <><div className="mb-3"><b>{content.path}</b></div><pre className="whitespace-pre-wrap text-sm leading-relaxed">{content.content}</pre></> : <p className="text-muted-foreground text-sm">Select a note or memory file to preview it.</p>}</div></div></div>;
}
