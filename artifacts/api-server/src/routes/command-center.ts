import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db, pool, agentsTable, agentCapabilitiesTable, workstreamsTable, agentRunsTable, agentRunEventsTable, approvalRequestsTable, artifactsTable, vaultsTable, scheduledJobsTable } from "@workspace/db";

const router: IRouter = Router();
let ensured = false;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function ensureCommandCenter() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id serial PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, type text NOT NULL DEFAULT 'custom', status text NOT NULL DEFAULT 'unknown', description text, base_url text, provider text, model text, profile_name text, last_seen_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS agent_capabilities (
      id serial PRIMARY KEY, agent_id integer NOT NULL, capability text NOT NULL, enabled boolean NOT NULL DEFAULT true, config_json jsonb
    );
    CREATE TABLE IF NOT EXISTS workstreams (
      id serial PRIMARY KEY, name text NOT NULL, category text, status text NOT NULL DEFAULT 'active', priority text NOT NULL DEFAULT 'normal', next_action text, due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id serial PRIMARY KEY, agent_id integer, workstream_id integer, title text NOT NULL, prompt text NOT NULL, status text NOT NULL DEFAULT 'queued', mode text NOT NULL DEFAULT 'approval_required', final_summary text, error text, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS agent_run_events (
      id serial PRIMARY KEY, agent_run_id integer NOT NULL, event_type text NOT NULL, label text NOT NULL, content text, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS approval_requests (
      id serial PRIMARY KEY, agent_run_id integer, action_type text NOT NULL, status text NOT NULL DEFAULT 'pending', title text NOT NULL, payload_json jsonb, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id serial PRIMARY KEY, agent_run_id integer, workstream_id integer, title text NOT NULL, artifact_type text NOT NULL DEFAULT 'link', path_or_url text NOT NULL, verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS vaults (
      id serial PRIMARY KEY, name text NOT NULL, path text NOT NULL, type text NOT NULL DEFAULT 'obsidian', enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id serial PRIMARY KEY, external_id text, name text NOT NULL, status text NOT NULL DEFAULT 'scheduled', schedule text, next_run_at timestamptz, last_run_at timestamptz, last_output text, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    CREATE INDEX IF NOT EXISTS idx_agent_run_events_run ON agent_run_events(agent_run_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status);
  `);

  const existingAgents = await db.select().from(agentsTable).limit(1);
  if (existingAgents.length === 0) {
    const [hermes] = await db.insert(agentsTable).values({
      name: "Hermes Default",
      slug: "hermes-default",
      type: "hermes",
      status: "online",
      description: "Primary Hermes agent for email, Obsidian, files, cron, research, and task execution.",
      provider: "openai-codex",
      model: "gpt-5.5",
      profileName: "default",
      lastSeenAt: new Date(),
    }).returning();
    const [builder] = await db.insert(agentsTable).values({
      name: "Paperclip Builder",
      slug: "paperclip-builder",
      type: "coding",
      status: "available",
      description: "Coding/build agent profile for Paperclip repo implementation tasks.",
      provider: "replit/codex",
      model: "agent",
    }).returning();
    await db.insert(agentCapabilitiesTable).values([
      ...["email", "obsidian", "files", "cron", "github", "research", "documents"].map((capability) => ({ agentId: hermes.id, capability, enabled: true })),
      ...["github", "coding", "files"].map((capability) => ({ agentId: builder.id, capability, enabled: true })),
    ]);
  }

  const existingWorkstreams = await db.select().from(workstreamsTable).limit(1);
  if (existingWorkstreams.length === 0) {
    await db.insert(workstreamsTable).values([
      { name: "GPU Donation Outreach", category: "Funding", priority: "high", nextAction: "Audit replies/bounces and approve follow-up emails." },
      { name: "Dump Truck Financing", category: "Equipment", priority: "high", nextAction: "Track lender responses and document packets." },
      { name: "Paperclip Command Center", category: "Software", priority: "high", nextAction: "Build app-native task execution and multi-agent management." },
    ]);
  }

  const existingVaults = await db.select().from(vaultsTable).limit(1);
  if (existingVaults.length === 0) {
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH || path.join(os.homedir(), "Documents", "Obsidian Vault", "Queen Ventures Command Center");
    await db.insert(vaultsTable).values({ name: "Queen Ventures Command Center", path: vaultPath, type: "obsidian", enabled: true });
  }

  const existingJobs = await db.select().from(scheduledJobsTable).limit(1);
  if (existingJobs.length === 0) {
    await db.insert(scheduledJobsTable).values({ externalId: "322219fb2cc3", name: "GPU donation outreach reply/bounce audit", status: "scheduled", schedule: "once at 2026-06-30 09:00 UTC", nextRunAt: new Date("2026-06-30T09:00:00Z") });
  }
  ensured = true;
}

function agentRunToJson(run: typeof agentRunsTable.$inferSelect) {
  return { ...run, createdAt: run.createdAt.toISOString(), startedAt: iso(run.startedAt), completedAt: iso(run.completedAt) };
}

router.use(async (_req, _res, next) => {
  try {
    await ensureCommandCenter();
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/command-center/overview", async (_req, res) => {
  const [agents, runs, approvals, artifacts, workstreams, jobs] = await Promise.all([
    db.select().from(agentsTable).orderBy(agentsTable.id),
    db.select().from(agentRunsTable).orderBy(desc(agentRunsTable.createdAt)).limit(5),
    db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.status, "pending")).orderBy(desc(approvalRequestsTable.createdAt)).limit(10),
    db.select().from(artifactsTable).orderBy(desc(artifactsTable.createdAt)).limit(10),
    db.select().from(workstreamsTable).orderBy(desc(workstreamsTable.updatedAt)),
    db.select().from(scheduledJobsTable).orderBy(desc(scheduledJobsTable.createdAt)).limit(10),
  ]);
  res.json({ agents, runs: runs.map(agentRunToJson), approvals, artifacts, workstreams, jobs });
});

router.get("/agents", async (_req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.id);
  const capabilities = await db.select().from(agentCapabilitiesTable);
  res.json(agents.map((agent) => ({ ...agent, capabilities: capabilities.filter((c) => c.agentId === agent.id) })));
});

router.post("/agents", async (req, res) => {
  const body = req.body as { name?: string; slug?: string; type?: string; description?: string; baseUrl?: string; provider?: string; model?: string; profileName?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: "Agent name is required" });
    return;
  }
  const slug = body.slug?.trim() || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [agent] = await db.insert(agentsTable).values({ name: body.name.trim(), slug, type: body.type || "custom", description: body.description, baseUrl: body.baseUrl, provider: body.provider, model: body.model, profileName: body.profileName, status: "configured" }).returning();
  res.status(201).json(agent);
});

router.patch("/agents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [agent] = await db.update(agentsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(agentsTable.id, id)).returning();
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

router.get("/workstreams", async (_req, res) => {
  res.json(await db.select().from(workstreamsTable).orderBy(desc(workstreamsTable.updatedAt)));
});

router.get("/agent-runs", async (_req, res) => {
  const runs = await db.select().from(agentRunsTable).orderBy(desc(agentRunsTable.createdAt)).limit(50);
  res.json(runs.map(agentRunToJson));
});

router.post("/agent-runs", async (req, res) => {
  const body = req.body as { title?: string; prompt?: string; agentId?: number; workstreamId?: number; mode?: string };
  if (!body.title?.trim() || !body.prompt?.trim()) {
    res.status(400).json({ error: "Title and prompt are required" });
    return;
  }
  const now = new Date();
  const [run] = await db.insert(agentRunsTable).values({ title: body.title.trim(), prompt: body.prompt.trim(), agentId: body.agentId, workstreamId: body.workstreamId, mode: body.mode || "approval_required", status: "waiting_for_approval", startedAt: now, finalSummary: "Task captured in Paperclip. Real Hermes execution hook is ready to connect; approve the drafted action cards before any side effects." }).returning();
  await db.insert(agentRunEventsTable).values([
    { agentRunId: run.id, eventType: "status", label: "Task created", content: `Paperclip created an app-native task for: ${run.title}` },
    { agentRunId: run.id, eventType: "approval", label: "Approval required", content: "This MVP creates approval cards instead of performing outside-world side effects automatically." },
  ]);
  await db.insert(approvalRequestsTable).values({ agentRunId: run.id, actionType: "execute_task", title: `Approve execution: ${run.title}`, payload: { prompt: run.prompt, agentId: run.agentId, workstreamId: run.workstreamId } });
  await db.insert(artifactsTable).values({ agentRunId: run.id, workstreamId: run.workstreamId, title: `${run.title} - task brief`, artifactType: "note", pathOrUrl: `paperclip://agent-runs/${run.id}`, verified: true });
  res.status(201).json(agentRunToJson(run));
});

router.get("/agent-runs/:id/events", async (req, res) => {
  const runId = Number(req.params.id);
  res.json(await db.select().from(agentRunEventsTable).where(eq(agentRunEventsTable.agentRunId, runId)).orderBy(agentRunEventsTable.createdAt));
});

router.get("/approvals", async (_req, res) => {
  res.json(await db.select().from(approvalRequestsTable).orderBy(desc(approvalRequestsTable.createdAt)).limit(100));
});

router.patch("/approvals/:id", async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status === "approved" ? "approved" : req.body?.status === "rejected" ? "rejected" : null;
  if (!status) {
    res.status(400).json({ error: "status must be approved or rejected" });
    return;
  }
  const [approval] = await db.update(approvalRequestsTable).set({ status, decidedAt: new Date() }).where(eq(approvalRequestsTable.id, id)).returning();
  if (!approval) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  if (approval.agentRunId) {
    await db.insert(agentRunEventsTable).values({ agentRunId: approval.agentRunId, eventType: "approval", label: `Approval ${status}`, content: approval.title });
    await db.update(agentRunsTable).set({ status: status === "approved" ? "completed" : "cancelled", completedAt: new Date(), finalSummary: status === "approved" ? "Approved in Paperclip. Connect a live Hermes executor to perform this action automatically." : "Rejected in Paperclip." }).where(eq(agentRunsTable.id, approval.agentRunId));
  }
  res.json(approval);
});

router.get("/artifacts", async (_req, res) => {
  res.json(await db.select().from(artifactsTable).orderBy(desc(artifactsTable.createdAt)).limit(100));
});

router.get("/scheduled-jobs", async (_req, res) => {
  res.json(await db.select().from(scheduledJobsTable).orderBy(desc(scheduledJobsTable.createdAt)).limit(100));
});

router.get("/vaults", async (_req, res) => {
  res.json(await db.select().from(vaultsTable).orderBy(vaultsTable.id));
});

async function safeList(root: string, rel = "") {
  const absRoot = path.resolve(root);
  const abs = path.resolve(absRoot, rel);
  if (!abs.startsWith(absRoot)) throw new Error("Path outside allowed vault");
  const entries = await fs.readdir(abs, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({ name: e.name, path: path.relative(absRoot, path.join(abs, e.name)), type: e.isDirectory() ? "directory" : "file" }))
    .sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
}

router.get("/vault-files", async (req, res) => {
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.enabled, true)).limit(1);
  if (!vault) {
    res.json([]);
    return;
  }
  try { res.json(await safeList(vault.path, String(req.query.path || ""))); }
  catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : "Unable to list vault" }); }
});

router.get("/vault-file", async (req, res) => {
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.enabled, true)).limit(1);
  if (!vault) {
    res.status(404).json({ error: "No vault configured" });
    return;
  }
  const absRoot = path.resolve(vault.path);
  const abs = path.resolve(absRoot, String(req.query.path || ""));
  if (!abs.startsWith(absRoot)) {
    res.status(400).json({ error: "Path outside allowed vault" });
    return;
  }
  const content = await fs.readFile(abs, "utf8");
  res.json({ path: path.relative(absRoot, abs), content });
});

const memoryRoot = path.join(os.homedir(), ".hermes");
router.get("/memory-files", async (req, res) => {
  try { res.json(await safeList(memoryRoot, String(req.query.path || ""))); }
  catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : "Unable to list memory files" }); }
});

router.get("/memory-file", async (req, res) => {
  const absRoot = path.resolve(memoryRoot);
  const abs = path.resolve(absRoot, String(req.query.path || ""));
  if (!abs.startsWith(absRoot)) {
    res.status(400).json({ error: "Path outside allowed memory root" });
    return;
  }
  const content = await fs.readFile(abs, "utf8");
  res.json({ path: path.relative(absRoot, abs), content });
});

export default router;
