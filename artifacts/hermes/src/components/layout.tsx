import { Link, useLocation } from "wouter";
import { Activity, MessageSquare, Settings, Zap, Menu, Bot, CheckSquare, Paperclip, Database, CalendarClock, FolderKanban } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Command", icon: Activity },
    { href: "/actions", label: "Actions", icon: Zap },
    { href: "/workstreams", label: "Workstreams", icon: FolderKanban },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/approvals", label: "Approvals", icon: CheckSquare },
    { href: "/artifacts", label: "Artifacts", icon: Paperclip },
    { href: "/obsidian", label: "Obsidian/Memory", icon: Database },
    { href: "/scheduled-jobs", label: "Scheduled", icon: CalendarClock },
    { href: "/threads", label: "Threads", icon: MessageSquare },
    { href: "/workflows", label: "Workflows", icon: Zap },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col gap-2 p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 px-2 pb-6 pt-2">
        <div className="bg-primary text-primary-foreground p-1.5 rounded flex items-center justify-center">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <span className="font-bold text-lg tracking-tight uppercase text-primary">Hermes</span>
      </div>
      
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
        <NavContent />
      </aside>

      {/* Mobile Sidebar & Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-border">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="font-bold text-primary ml-2 uppercase tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 fill-current" /> Hermes
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
