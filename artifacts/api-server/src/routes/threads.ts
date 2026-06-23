import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, threadsTable, workflowsTable, messagesTable } from "@workspace/db";
import {
  ListThreadsQueryParams,
  CreateThreadBody,
  GetThreadParams,
  UpdateThreadParams,
  UpdateThreadBody,
  DeleteThreadParams,
  PinThreadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildThreadResponse(thread: typeof threadsTable.$inferSelect) {
  const workflow = thread.workflowId
    ? await db
        .select()
        .from(workflowsTable)
        .where(eq(workflowsTable.id, thread.workflowId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  const [msgCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(eq(messagesTable.threadId, thread.id));

  const [lastMsg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, thread.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  return {
    id: thread.id,
    title: thread.title,
    workflowId: thread.workflowId ?? null,
    workflowName: workflow?.name ?? null,
    workflowColor: workflow?.color ?? null,
    status: thread.status,
    pinned: thread.pinned,
    messageCount: msgCount?.count ?? 0,
    lastMessage: lastMsg?.content ?? null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

router.get("/threads", async (req, res): Promise<void> => {
  const qp = ListThreadsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  let query = db.select().from(threadsTable).$dynamic();
  if (qp.data.workflowId !== undefined) {
    query = query.where(eq(threadsTable.workflowId, qp.data.workflowId));
  }

  const threads = await query.orderBy(desc(threadsTable.pinned), desc(threadsTable.updatedAt));
  const result = await Promise.all(threads.map(buildThreadResponse));
  res.json(result);
});

router.post("/threads", async (req, res): Promise<void> => {
  const parsed = CreateThreadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [thread] = await db
    .insert(threadsTable)
    .values({
      title: parsed.data.title,
      workflowId: parsed.data.workflowId ?? null,
    })
    .returning();

  res.status(201).json(await buildThreadResponse(thread));
});

router.get("/threads/:id", async (req, res): Promise<void> => {
  const params = GetThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.id, params.data.id));

  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  res.json(await buildThreadResponse(thread));
});

router.patch("/threads/:id", async (req, res): Promise<void> => {
  const params = UpdateThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateThreadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.workflowId !== undefined) updates.workflowId = parsed.data.workflowId;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const [thread] = await db
    .update(threadsTable)
    .set(updates)
    .where(eq(threadsTable.id, params.data.id))
    .returning();

  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  res.json(await buildThreadResponse(thread));
});

router.delete("/threads/:id", async (req, res): Promise<void> => {
  const params = DeleteThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [thread] = await db
    .delete(threadsTable)
    .where(eq(threadsTable.id, params.data.id))
    .returning();

  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/threads/:id/pin", async (req, res): Promise<void> => {
  const params = PinThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const [thread] = await db
    .update(threadsTable)
    .set({ pinned: !existing.pinned })
    .where(eq(threadsTable.id, params.data.id))
    .returning();

  res.json(await buildThreadResponse(thread));
});

export default router;
