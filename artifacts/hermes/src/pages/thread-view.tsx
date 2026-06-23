import {
  useGetThread,
  useListMessages,
  useSendMessage,
  usePinThread,
  useUpdateThread,
  useListWorkflows,
  getListMessagesQueryKey,
  getGetThreadQueryKey,
  getListThreadsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Pin,
  Send,
  ChevronDown,
  Check,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ThreadView() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading: threadLoading } = useGetThread(id, {
    query: { enabled: !!id, queryKey: getGetThreadQueryKey(id) },
  });

  const { data: messages, isLoading: messagesLoading } = useListMessages(id, {
    query: {
      enabled: !!id,
      queryKey: getListMessagesQueryKey(id),
      refetchInterval: 5000,
    },
  });

  const { data: workflows } = useListWorkflows();
  const sendMut = useSendMessage();
  const pinMut = usePinThread();
  const updateMut = useUpdateThread();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    sendMut.mutate(
      { id, data: { content } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
          setSending(false);
        },
        onError: () => {
          toast({ title: "Failed to send message", variant: "destructive" });
          setInput(content);
          setSending(false);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function togglePin() {
    pinMut.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetThreadQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
        },
      }
    );
  }

  function changeWorkflow(val: string) {
    const wfId = val === "none" ? null : parseInt(val);
    updateMut.mutate(
      { id, data: { ...(wfId !== null ? { workflowId: wfId } : { workflowId: null }) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetThreadQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
        },
      }
    );
  }

  function changeStatus(status: string) {
    updateMut.mutate(
      { id, data: { status: status as "active" | "completed" | "archived" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetThreadQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
        },
      }
    );
  }

  if (threadLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-3/4 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button
          data-testid="button-back"
          onClick={() => setLocation("/threads")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div
          className="w-1 h-8 rounded-full shrink-0"
          style={{ backgroundColor: thread.workflowColor ?? "#374151" }}
        />

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{thread.title}</h2>
          <p className="text-xs text-muted-foreground">{thread.workflowName ?? "No workflow"}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Workflow selector */}
          <Select
            value={thread.workflowId?.toString() ?? "none"}
            onValueChange={changeWorkflow}
          >
            <SelectTrigger data-testid="select-thread-workflow" className="h-7 text-xs w-32 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No workflow</SelectItem>
              {workflows?.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={thread.status} onValueChange={changeStatus}>
            <SelectTrigger data-testid="select-thread-status" className="h-7 text-xs w-28 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <button
            data-testid="button-pin"
            onClick={togglePin}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              thread.pinned ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className="h-12 w-2/3 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a command to your Hermes agent below.
            </p>
          </div>
        ) : (
          messages?.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {msg.role === "agent" && (
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                    Hermes
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-1.5 ${
                    msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border px-4 py-3 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              Hermes is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            data-testid="input-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a command to Hermes... (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none text-sm min-h-[44px] max-h-32 bg-background border-border"
            rows={1}
          />
          <Button
            data-testid="button-send-message"
            onClick={send}
            disabled={!input.trim() || sending}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Messages are relayed to your Hermes agent via Telegram
        </p>
      </div>
    </div>
  );
}
