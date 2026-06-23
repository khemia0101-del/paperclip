import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, workflowsTable, threadsTable } from "@workspace/db";
import {
  CreateWorkflowBody,
  UpdateWorkflowParams,
  UpdateWorkflowBody,
  DeleteWorkflowParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workflows", async (req, res): Promise<void> => {
  const workflows = await db.select().from(workflowsTable).orderBy(workflowsTable.createdAt);

  const counts = await db
    .select({ workflowId: threadsTable.workflowId, count: sql<number>`count(*)::int` })
    .from(threadsTable)
    .groupBy(threadsTable.workflowId);

  const countMap = new Map(counts.map((c) => [c.workflowId, c.count]));

  const result = workflows.map((w) => ({
    ...w,
    description: w.description ?? null,
    createdAt: w.createdAt.toISOString(),
    threadCount: countMap.get(w.id) ?? 0,
  }));

  res.json(result);
});

router.post("/workflows", async (req, res): Promise<void> => {
  const parsed = CreateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workflow] = await db
    .insert(workflowsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      icon: parsed.data.icon,
    })
    .returning();

  res.status(201).json({
    ...workflow,
    description: workflow.description ?? null,
    createdAt: workflow.createdAt.toISOString(),
    threadCount: 0,
  });
});

router.patch("/workflows/:id", async (req, res): Promise<void> => {
  const params = UpdateWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;

  const [workflow] = await db
    .update(workflowsTable)
    .set(updates)
    .where(eq(workflowsTable.id, params.data.id))
    .returning();

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.json({
    ...workflow,
    description: workflow.description ?? null,
    createdAt: workflow.createdAt.toISOString(),
    threadCount: 0,
  });
});

router.delete("/workflows/:id", async (req, res): Promise<void> => {
  const params = DeleteWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db
    .delete(workflowsTable)
    .where(eq(workflowsTable.id, params.data.id))
    .returning();

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
