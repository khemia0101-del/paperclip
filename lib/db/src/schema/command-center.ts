import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("custom"),
  status: text("status").notNull().default("unknown"),
  description: text("description"),
  baseUrl: text("base_url"),
  provider: text("provider"),
  model: text("model"),
  profileName: text("profile_name"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentCapabilitiesTable = pgTable("agent_capabilities", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  capability: text("capability").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config_json"),
});

export const workstreamsTable = pgTable("workstreams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("normal"),
  nextAction: text("next_action"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentRunsTable = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id"),
  workstreamId: integer("workstream_id"),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("queued"),
  mode: text("mode").notNull().default("approval_required"),
  finalSummary: text("final_summary"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const agentRunEventsTable = pgTable("agent_run_events", {
  id: serial("id").primaryKey(),
  agentRunId: integer("agent_run_id").notNull(),
  eventType: text("event_type").notNull(),
  label: text("label").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalRequestsTable = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  agentRunId: integer("agent_run_id"),
  actionType: text("action_type").notNull(),
  status: text("status").notNull().default("pending"),
  title: text("title").notNull(),
  payload: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const artifactsTable = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  agentRunId: integer("agent_run_id"),
  workstreamId: integer("workstream_id"),
  title: text("title").notNull(),
  artifactType: text("artifact_type").notNull().default("link"),
  pathOrUrl: text("path_or_url").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaultsTable = pgTable("vaults", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull().default("obsidian"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const scheduledJobsTable = pgTable("scheduled_jobs", {
  id: serial("id").primaryKey(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("scheduled"),
  schedule: text("schedule"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastOutput: text("last_output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
