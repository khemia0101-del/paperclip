import { useListWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow, getListWorkflowsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, Monitor, Zap, Globe, Code, Database, Bot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const ICONS = ["Mail", "Monitor", "Zap", "Globe", "Code", "Database", "Bot", "Search"];
const COLORS = [
  "#f59e0b", "#6366f1", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

function getIcon(name: string) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Mail, Monitor, Zap, Globe, Code, Database, Bot, Search,
  };
  return map[name] ?? Zap;
}

type WorkflowForm = { name: string; description: string; color: string; icon: string };
const defaultForm: WorkflowForm = { name: "", description: "", color: "#f59e0b", icon: "Zap" };

export default function Workflows() {
  const qc = useQueryClient();
  const { data: workflows, isLoading } = useListWorkflows();
  const createMut = useCreateWorkflow();
  const updateMut = useUpdateWorkflow();
  const deleteMut = useDeleteWorkflow();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<WorkflowForm>(defaultForm);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(wf: { id: number; name: string; description?: string | null; color: string; icon: string }) {
    setEditing(wf.id);
    setForm({ name: wf.name, description: wf.description ?? "", color: wf.color, icon: wf.icon });
    setDialogOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editing !== null) {
      updateMut.mutate(
        { id: editing, data: form },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
            setDialogOpen(false);
            toast({ title: "Workflow updated" });
          },
        }
      );
    } else {
      createMut.mutate(
        { data: form },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
            setDialogOpen(false);
            toast({ title: "Workflow created" });
          },
        }
      );
    }
  }

  function remove(id: number) {
    deleteMut.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
          toast({ title: "Workflow deleted" });
        },
      }
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your agent tasks by category</p>
        </div>
        <Button
          data-testid="button-create-workflow"
          onClick={openCreate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
        </div>
      ) : workflows?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workflows yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows?.map((wf) => {
            const Icon = getIcon(wf.icon);
            return (
              <div
                key={wf.id}
                data-testid={`workflow-item-${wf.id}`}
                className="flex items-center gap-4 p-4 rounded border border-border bg-card hover:border-border/80 transition-colors"
                style={{ borderLeft: `3px solid ${wf.color}` }}
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded"
                  style={{ backgroundColor: `${wf.color}20`, color: wf.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{wf.name}</p>
                  {wf.description && (
                    <p className="text-xs text-muted-foreground truncate">{wf.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                  {wf.threadCount} threads
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-edit-workflow-${wf.id}`}
                    onClick={() => openEdit(wf)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-delete-workflow-${wf.id}`}
                    onClick={() => remove(wf.id)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing !== null ? "Edit Workflow" : "New Workflow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wf-name">Name</Label>
              <Input
                id="wf-name"
                data-testid="input-workflow-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Email Outreach"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wf-desc">Description</Label>
              <Input
                id="wf-desc"
                data-testid="input-workflow-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    data-testid={`color-swatch-${c}`}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {ICONS.map((name) => {
                  const Icon = getIcon(name);
                  return (
                    <button
                      key={name}
                      data-testid={`icon-${name}`}
                      onClick={() => setForm((f) => ({ ...f, icon: name }))}
                      className={`p-2 rounded border transition-colors ${
                        form.icon === name
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-border/80 text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-workflow"
              onClick={save}
              disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
            >
              {editing !== null ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
