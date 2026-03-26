import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useModel } from "@/context/ModelContext";
import { Monitor, Bluetooth, Code2, BookOpen, Glasses, Timer } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { model, setModel } = useModel();

  const nav = [
    { href: "/", label: "Simulator", icon: Monitor },
    { href: "/ble", label: "BLE Workbench", icon: Bluetooth },
    { href: "/features", label: "Features", icon: Code2 },
    { href: "/break-timer", label: "Break Timer", icon: Timer },
    { href: "/reference", label: "Protocol Ref", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col relative z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_hsla(var(--primary)/0.2)]">
            <Glasses className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Even Dev</h1>
            <p className="text-xs text-muted-foreground">Studio Platform</p>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="p-1 rounded-lg bg-black/50 border border-white/5 flex">
            {(["G1", "G2"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                  model === m 
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsla(var(--primary)/0.3)]" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 mt-auto border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsla(var(--primary)/0.8)]"></div>
            SDK v0.2.0 • Online
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Subtle top gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none mix-blend-screen" />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 terminal-scrollbar relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
