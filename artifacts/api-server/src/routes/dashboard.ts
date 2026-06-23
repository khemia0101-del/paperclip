import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, threadsTable, messagesTable, workflowsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [threadStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
    })
    .from(threadsTable);

  const [msgStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(messagesTable);

  const workflowCounts = await db
    .select({
      workflowId: threadsTable.workflowId,
      count: sql<number>`count(*)::int`,
    })
    .from(threadsTable)
    .where(sql`workflow_id is not null`)
    .groupBy(threadsTable.workflowId);

  const workflows = await db.select().from(workflowsTable);
  const workflowMap = new Map(workflows.map((w) => [w.id, w]));

  const workflowBreakdown = workflowCounts
    .filter((c) => c.workflowId !== null)
    .map((c) => {
      const wf = workflowMap.get(c.workflowId!);
      return {
        workflowId: c.workflowId!,
        workflowName: wf?.name ?? "Unknown",
        color: wf?.color ?? "#6b7280",
        threadCount: c.count,
      };
    });

  res.json({
    totalThreads: threadStats?.total ?? 0,
    activeThreads: threadStats?.active ?? 0,
    totalMessages: msgStats?.total ?? 0,
    workflowBreakdown,
  });
});

export default router;
