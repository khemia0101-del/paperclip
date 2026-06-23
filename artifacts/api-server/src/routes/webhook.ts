import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, threadsTable, messagesTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();

async function getSettingValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

router.post("/webhook/telegram", async (req, res): Promise<void> => {
  const secretToken = req.headers["x-telegram-bot-api-secret-token"];
  const expectedToken = await getSettingValue("telegram_webhook_secret");

  if (expectedToken && secretToken !== expectedToken) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const update = req.body as {
    update_id?: number;
    message?: {
      message_id: number;
      text?: string;
      chat?: { id: number };
      from?: { is_bot?: boolean; username?: string };
      reply_to_message?: { message_id: number };
    };
  };

  if (!update.message?.text) {
    res.status(200).json({ ok: true });
    return;
  }

  const message = update.message;
  const messageText = message.text!;
  const chatId = await getSettingValue("telegram_chat_id");

  if (chatId && String(message.chat?.id) !== chatId) {
    res.status(200).json({ ok: true });
    return;
  }

  const isBot = message.from?.is_bot === true;
  if (!isBot) {
    res.status(200).json({ ok: true });
    return;
  }

  const replyToId = message.reply_to_message?.message_id ?? null;

  let threadId: number | null = null;

  if (replyToId !== null) {
    const [matchedMsg] = await db
      .select({ threadId: messagesTable.threadId })
      .from(messagesTable)
      .where(eq(messagesTable.telegramMessageId, replyToId));
    if (matchedMsg) {
      threadId = matchedMsg.threadId;
    }
  }

  if (threadId === null) {
    const recentThreads = await db
      .select({ id: threadsTable.id })
      .from(threadsTable)
      .orderBy(desc(threadsTable.updatedAt))
      .limit(1);
    if (recentThreads.length > 0) {
      threadId = recentThreads[0].id;
    }
  }

  if (threadId === null) {
    res.status(200).json({ ok: true });
    return;
  }

  await db.insert(messagesTable).values({
    threadId,
    role: "agent",
    content: messageText,
    telegramMessageId: message.message_id,
  });

  await db
    .update(threadsTable)
    .set({ updatedAt: new Date() })
    .where(eq(threadsTable.id, threadId));

  res.status(200).json({ ok: true });
});

router.post("/webhook/register", async (req, res): Promise<void> => {
  const token = await getSettingValue("telegram_bot_token");
  if (!token) {
    res.status(400).json({ error: "Telegram bot token not configured" });
    return;
  }

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domains) {
    res.status(500).json({ error: "REPLIT_DOMAINS not set" });
    return;
  }

  const webhookUrl = `https://${domains}/api/webhook/telegram`;

  const secret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  await db
    .insert(settingsTable)
    .values({ key: "telegram_webhook_secret", value: secret })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: secret } });

  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
  });
  const data = await resp.json() as { ok: boolean; description?: string };

  if (!data.ok) {
    res.status(502).json({ error: data.description ?? "Failed to register webhook" });
    return;
  }

  res.json({ ok: true, webhookUrl });
});

router.get("/webhook/status", async (req, res): Promise<void> => {
  const token = await getSettingValue("telegram_bot_token");
  if (!token) {
    res.json({ registered: false, reason: "no_token" });
    return;
  }

  const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const resp = await fetch(url);
  const data = await resp.json() as {
    ok: boolean;
    result?: { url?: string; pending_update_count?: number; last_error_message?: string };
  };

  if (!data.ok || !data.result?.url) {
    res.json({ registered: false, reason: "not_set" });
    return;
  }

  res.json({
    registered: true,
    url: data.result.url,
    pendingUpdates: data.result.pending_update_count ?? 0,
    lastError: data.result.last_error_message ?? null,
  });
});

export default router;
