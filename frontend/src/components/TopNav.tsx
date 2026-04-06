import { useEffect, useState } from "react";
import { MessageSquare, BarChart3, Lightbulb } from "lucide-react";
import { checkHealth, getProvider } from "@/lib/api";
import type { HealthResponse } from "@/types/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

type HealthState = "unknown" | "online" | "offline";

const TopNav = ({ activeTab, onTabChange }: TopNavProps) => {
  const [health, setHealth] = useState<HealthState>("unknown");
  const [healthInfo, setHealthInfo] = useState<HealthResponse | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>("auto");
  const [providerError, setProviderError] = useState<string | null>(null);

  const pollHealth = async () => {
    try {
      const h = await checkHealth();
      setHealth("online");
      setHealthInfo(h);
    } catch {
      setHealth("offline");
      setHealthInfo(null);
    }
  };

  useEffect(() => {
    pollHealth();
    const id = setInterval(pollHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch current provider on mount
  useEffect(() => {
    getProvider()
      .then((p) => setProviderLabel(p.provider || "auto"))
      .catch((e) => setProviderError((e as Error).message));
  }, []);

  const dotColor =
    health === "online"
      ? "bg-emerald-400"
      : health === "offline"
      ? "bg-red-400"
      : "bg-muted-foreground/40";

  const tooltip =
    health === "online"
      ? `Backend online — ${healthInfo?.active_sessions ?? 0} active session${healthInfo?.active_sessions !== 1 ? "s" : ""}`
      : health === "offline"
      ? "Backend unreachable"
      : "Checking backend…";

  return (
    <TooltipProvider>
      <nav className="flex items-center gap-1 px-6 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}

        {/* Provider toggle + health indicator pushed to the far right */}
        <div className="ml-auto flex items-center gap-3">
          {/* Provider status */}
          <div className="flex flex-col items-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-3 py-1 text-xs font-medium rounded-md bg-secondary/60 text-foreground/90 border border-border/40">
                  LLM Auto Fallback
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Provider mode: <strong>{providerLabel}</strong> (OpenRouter/Groq/Ollama fallback chain)</p>
              </TooltipContent>
            </Tooltip>
            {providerError && (
              <span className="text-[10px] text-red-400 max-w-[160px] text-right leading-tight">
                {providerError}
              </span>
            )}
          </div>

          {/* Health indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 cursor-default select-none">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${health === "online" ? "shadow-sm shadow-emerald-400/60" : ""}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {health === "online" ? "Online" : health === "offline" ? "Offline" : "…"}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
};

export default TopNav;
