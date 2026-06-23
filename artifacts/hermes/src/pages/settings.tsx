import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings();

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setToken(settings.telegramBotToken ?? "");
      setChatId(settings.telegramChatId ?? "");
    }
  }, [settings]);

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

          <div className="border-t border-border pt-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              How it works
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>1. Create a Telegram bot via @BotFather and get your Bot Token</li>
              <li>2. Find your Chat ID using @userinfobot</li>
              <li>3. Send your Hermes agent a message through this app</li>
              <li>4. Hermes agent replies via Telegram — replies are polled and shown here</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
