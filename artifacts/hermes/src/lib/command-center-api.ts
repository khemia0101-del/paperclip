export type Agent = { id: number; name: string; slug: string; type: string; status: string; description?: string | null; provider?: string | null; model?: string | null; profileName?: string | null; capabilities?: Array<{ capability: string; enabled: boolean }> };
export type Workstream = { id: number; name: string; category?: string | null; status: string; priority: string; nextAction?: string | null };
export type AgentRun = { id: number; agentId?: number | null; workstreamId?: number | null; title: string; prompt: string; status: string; finalSummary?: string | null; createdAt: string; completedAt?: string | null };
export type Approval = { id: number; agentRunId?: number | null; actionType: string; status: string; title: string; payload?: unknown; createdAt: string };
export type Artifact = { id: number; agentRunId?: number | null; workstreamId?: number | null; title: string; artifactType: string; pathOrUrl: string; verified: boolean; createdAt: string };
export type VaultEntry = { name: string; path: string; type: "directory" | "file" };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
