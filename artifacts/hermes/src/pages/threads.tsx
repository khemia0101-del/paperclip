import {
  useListThreads,
  useListWorkflows,
  useCreateThread,
  useDeleteThread,
  usePinThread,
  getListThreadsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Plus, Pin, Trash2, MessageSquare, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Threads() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [workflowFilter, setWorkflowFilter] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newWorkflowId, setNewWorkflowId] = useState<string>("none");

  const { data: threads, isLoading } = useListThreads(
    workflowFilter ? { workflowId: workflowFilter } : undefined
  );
  const { data: workflows } = useListWorkflows();

  const createMut = useCreateThread();
  const deleteMut = useDeleteThread();
  const pinMut = usePinThread();

  function create() {
    if (!newTitle.trim()) return;
    const wfId = newWorkflowId !== "none" ? parseInt(newWorkflowId) : undefined;
    createMut.mutate(
      { data: { title: newTitle.trim(), ...(wfId ? { workflowId: wfId } : {}) } },
      {
        onSuccess: (thread) => {
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
          setDialogOpen(false);
          setNewTitle("");
          setNewWorkflowId("none");
          setLocation(`/threads/${thread.id}`);
        },
      }
    );
  }

  function remove(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    deleteMut.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListThreadsQueryKey() });
          toast({ title: "Thread deleted" });
        },
      }
    );
  }

  function togglePin(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    pinMut.mutate(
      { id },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListThreadsQueryKey() }) }
    );
  }

  const pinned = threads?.filter((t) => t.pinned) ?? [];
  const unpinned = threads?.filter((t) => !t.pinned) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Threads</h1>
          <p className="text-sm text-muted-foreground mt-1">All your agent conversations</p>
        </div>
        <Button data-testid="button-new-thread" onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Thread
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={workflowFilter?.toString() ?? "all"}
          onValueChange={(v) => setWorkflowFilter(v === "all" ? undefined : parseInt(v))}
        >
          <SelectTrigger data-testid="select-workflow-filter" className="w-44 h-8 text-xs">
            <SelectValue placeholder="All workflows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workflows</SelectItem>
            {workflows?.map((w) => (
              <SelectItem key={w.id} value={w.id.toString()}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
        </div>
      ) : threads?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No threads found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Pin className="w-3 h-3" /> Pinned
              </p>
              <div className="space-y-2">
                {pinned.map((t) => (
                  <ThreadRow key={t.id} thread={t} onPin={togglePin} onDelete={remove} />
                ))}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  All Threads
                </p>
              )}
              <div className="space-y-2">
                {unpinned.map((t) => (
                  <ThreadRow key={t.id} thread={t} onPin={togglePin} onDelete={remove} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>New Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="thread-title">Title</Label>
              <Input
                id="thread-title"
                data-testid="input-thread-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Cold outreach to SaaS founders"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
            <div>
              <Label htmlFor="thread-workflow">Workflow (optional)</Label>
              <Select value={newWorkflowId} onValueChange={setNewWorkflowId}>
                <SelectTrigger data-testid="select-thread-workflow" className="mt-1">
                  <SelectValue placeholder="No workflow" />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-create-thread"
              onClick={create}
              disabled={!newTitle.trim() || createMut.isPending}
            >
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ThreadRow({
  thread,
  onPin,
  onDelete,
}: {
  thread: {
    id: number;
    title: string;
    workflowColor?: string | null;
    workflowName?: string | null;
    status: string;
    pinned: boolean;
    messageCount: number;
    lastMessage?: string | null;
    updatedAt: string;
  };
  onPin: (id: number, e: React.MouseEvent) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
}) {
  return (
    <Link href={`/threads/${thread.id}`}>
      <div
        data-testid={`thread-row-${thread.id}`}
        className="flex items-center gap-3 p-3 rounded border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer group"
        style={{ borderLeft: `3px solid ${thread.workflowColor ?? "#374151"}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {thread.title}
          </p>
          {thread.lastMessage && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {thread.workflowName && (
            <span className="text-xs text-muted-foreground hidden sm:block mr-1">
              {thread.workflowName}
            </span>
          )}
          <span
            className={`text-xs font-mono uppercase tracking-wide ${
              thread.status === "active" ? "text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {thread.status}
          </span>
          <span className="text-xs text-muted-foreground font-mono ml-1">
            {thread.messageCount}
          </span>
          <button
            data-testid={`button-pin-thread-${thread.id}`}
            onClick={(e) => onPin(thread.id, e)}
            className={`p-1 rounded hover:bg-muted transition-colors ml-1 ${
              thread.pinned ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            data-testid={`button-delete-thread-${thread.id}`}
            onClick={(e) => onDelete(thread.id, e)}
            className="p-1 rounded hover:bg-muted hover:text-destructive transition-colors text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}
