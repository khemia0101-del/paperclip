import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getSettingValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

router.get("/settings", async (_req, res): Promise<void> => {
  const token = await getSettingValue("telegram_bot_token");
  const chatId = await getSettingValue("telegram_chat_id");

  res.json({
    telegramBotToken: token,
    telegramChatId: chatId,
    configured: !!(token && chatId),
  });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.telegramBotToken !== undefined) {
    await setSetting("telegram_bot_token", parsed.data.telegramBotToken);
  }
  if (parsed.data.telegramChatId !== undefined) {
    await setSetting("telegram_chat_id", parsed.data.telegramChatId);
  }

  const token = await getSettingValue("telegram_bot_token");
  const chatId = await getSettingValue("telegram_chat_id");

  res.json({
    telegramBotToken: token,
    telegramChatId: chatId,
    configured: !!(token && chatId),
  });
});

export default router;
