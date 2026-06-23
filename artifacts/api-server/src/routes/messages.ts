import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, threadsTable, messagesTable, settingsTable } from "@workspace/db";
import { ListMessagesParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getSettingValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<number | null> {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await resp.json() as { ok: boolean; result?: { message_id: number } };
    if (data.ok && data.result) {
      return data.result.message_id;
    }
    return null;
  } catch {
    return null;
  }
}

async function pollTelegramForReply(token: string, _chatId: string, afterMessageId: number): Promise<string | null> {
  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${afterMessageId + 1}&timeout=10&limit=5`;
    const resp = await fetch(url);
    const data = await resp.json() as { ok: boolean; result?: Array<{ update_id: number; message?: { message_id: number; text?: string; from?: { is_bot?: boolean } } }> };
    if (data.ok && data.result && data.result.length > 0) {
      for (const update of data.result) {
        if (update.message?.text && !update.message.from?.is_bot) {
          continue;
        }
        if (update.message?.text) {
          return update.message.text;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

router.get("/threads/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
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

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(
    messages.map((m) => ({
      ...m,
      telegramMessageId: m.telegramMessageId ?? null,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/threads/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

  const token = await getSettingValue("telegram_bot_token");
  const chatId = await getSettingValue("telegram_chat_id");

  let telegramMessageId: number | null = null;

  if (token && chatId) {
    telegramMessageId = await sendTelegramMessage(token, chatId, parsed.data.content);
  }

  const [userMessage] = await db
    .insert(messagesTable)
    .values({
      threadId: params.data.id,
      role: "user",
      content: parsed.data.content,
      telegramMessageId,
    })
    .returning();

  await db
    .update(threadsTable)
    .set({ updatedAt: new Date() })
    .where(eq(threadsTable.id, params.data.id));

  if (token && chatId && telegramMessageId) {
    await new Promise((r) => setTimeout(r, 3000));
    const reply = await pollTelegramForReply(token, chatId, telegramMessageId);
    if (reply) {
      await db.insert(messagesTable).values({
        threadId: params.data.id,
        role: "agent",
        content: reply,
        telegramMessageId: null,
      });
    }
  }

  res.status(201).json({
    ...userMessage,
    telegramMessageId: userMessage.telegramMessageId ?? null,
    createdAt: userMessage.createdAt.toISOString(),
  });
});

export default router;
