import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Eye, EyeOff, Webhook, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type WebhookStatus = {
  registered: boolean;
  url?: string;
  pendingUpdates?: number;
  lastError?: string | null;
  reason?: string;
};

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings();

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setToken(settings.telegramBotToken ?? "");
      setChatId(settings.telegramChatId ?? "");
    }
  }, [settings]);

  async function checkWebhookStatus() {
    setWebhookLoading(true);
    try {
      const resp = await fetch("/api/webhook/status");
      const data: WebhookStatus = await resp.json();
      setWebhookStatus(data);
    } catch {
      toast({ title: "Failed to check webhook status", variant: "destructive" });
    } finally {
      setWebhookLoading(false);
    }
  }

  async function registerWebhook() {
    setRegisterLoading(true);
    try {
      const resp = await fetch("/api/webhook/register", { method: "POST" });
      const data = await resp.json() as { ok?: boolean; webhookUrl?: string; error?: string };
      if (data.ok) {
        toast({ title: "Webhook registered!", description: `Pointing to ${data.webhookUrl}` });
        await checkWebhookStatus();
      } else {
        toast({ title: "Registration failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to register webhook", variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  }

  function save() {
    const data: { telegramBotToken?: string; telegramChatId?: string } = {};
    if (token.trim()) data.telegramBotToken = token.trim();
    if (chatId.trim()) data.telegramChatId = chatId.trim();

    updateMut.mutate(
      { data },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings saved" });
        },
        onError: () => {
          toast({ title: "Failed to save settings", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your Telegram connection</p>
      </div>

      {/* Connection status */}
      {!isLoading && (
        <div
          data-testid="status-telegram-connection"
          className={`flex items-center gap-3 p-4 rounded border ${
            settings?.configured
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          {settings?.configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-medium ${settings?.configured ? "text-emerald-400" : "text-amber-400"}`}>
              {settings?.configured ? "Connected to Telegram" : "Not configured"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {settings?.configured
                ? "Your Hermes agent is ready to relay messages."
                : "Enter your Bot Token and Chat ID to connect."}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <Label htmlFor="bot-token">Telegram Bot Token</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Get this from{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @BotFather
              </a>{" "}
              on Telegram
            </p>
            <div className="relative">
              <Input
                id="bot-token"
                data-testid="input-bot-token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456:ABC-DEF1234ghIkl..."
                className="pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="chat-id">Telegram Chat ID</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Your personal chat ID. Use{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @userinfobot
              </a>{" "}
              to find it.
            </p>
            <Input
              id="chat-id"
              data-testid="input-chat-id"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              className="font-mono text-sm"
            />
          </div>

          <Button
            data-testid="button-save-settings"
            onClick={save}
            disabled={updateMut.isPending}
            className="w-full"
          >
            {updateMut.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}

      {/* Webhook section */}
      {settings?.configured && (
        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Telegram Webhook</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Register a webhook so your Hermes agent's replies arrive instantly — no polling delay.
            Only needed once after you save your bot token.
          </p>

          {webhookStatus && (
            <div className={`p-3 rounded border text-xs space-y-1 ${
              webhookStatus.registered
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/5 text-amber-400"
            }`}>
              <p className="font-medium">
                {webhookStatus.registered ? "Webhook active" : "No webhook registered"}
              </p>
              {webhookStatus.url && (
                <p className="text-muted-foreground font-mono truncate">{webhookStatus.url}</p>
              )}
              {webhookStatus.lastError && (
                <p className="text-destructive">{webhookStatus.lastError}</p>
              )}
              {webhookStatus.registered && (
                <p className="text-muted-foreground">{webhookStatus.pendingUpdates ?? 0} pending updates</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkWebhookStatus}
              disabled={webhookLoading}
            >
              {webhookLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Check Status
            </Button>
            <Button
              size="sm"
              onClick={registerWebhook}
              disabled={registerLoading}
            >
              {registerLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Register Webhook
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-5 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          How it works
        </p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>1. Create a Telegram bot via @BotFather and get your Bot Token</li>
          <li>2. Find your Chat ID using @userinfobot</li>
          <li>3. Save settings, then click "Register Webhook" for instant replies</li>
          <li>4. Send your Hermes agent a message — replies appear instantly</li>
        </ul>
      </div>
    </div>
  );
}
