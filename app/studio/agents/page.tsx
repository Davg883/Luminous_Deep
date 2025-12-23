"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import {
    Cpu,
    MapPin,
    Zap,
    Power,
    ChevronRight,
    Terminal,
    Activity,
    Settings,
    User,
} from "lucide-react";

type Voice = "cassie" | "eleanor" | "julian" | "sparkline" | "hearth" | "systems" | "neutral";

interface Agent {
    _id: Id<"agents">;
    name: string;
    homeSpaceId: Id<"scenes">;
    role: string;
    description?: string;
    capabilities: string[];
    tools: string[];
    autonomy: number;
    voice?: Voice;
    isActive: boolean;
    createdAt: number;
    biography?: string;
    glimpseUrl?: string;
    homeSpace?: {
        slug: string;
        title: string;
        domain: string;
    } | null;
}

interface Space {
    _id: Id<"scenes">;
    slug: string;
    title: string;
    domain: string;
}

const voiceColors: Record<Voice, string> = {
    cassie: "text-amber-400",
    eleanor: "text-amber-100",
    julian: "text-sky-400",
    sparkline: "text-emerald-400",
    hearth: "text-orange-400",
    systems: "text-lime-400",
    neutral: "text-zinc-400",
};

const autonomyLabels = ["Reactive", "Guided", "Balanced", "Proactive", "Autonomous"];

export default function AgentManagerPage() {
    // Use type assertions since the API types regenerate after Convex deploys
    const agents = useQuery((api as any).studio?.agents?.listAgents ?? (api.public as any).scenes?.listScenes, {}) as Agent[] | undefined;
    const spaces = useQuery(api.public.scenes.listScenes, {}) as Space[] | undefined;
    const toggleActive = useMutation((api as any).studio?.agents?.toggleAgentActive ?? (() => { }));
    const assignToSpace = useMutation((api as any).studio?.agents?.assignAgentToSpace ?? (() => { }));

    const [selectedAgent, setSelectedAgent] = useState<Id<"agents"> | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    // Tab & Edit State
    const [activeTab, setActiveTab] = useState<"config" | "dossier">("config");
    const [dossierDraft, setDossierDraft] = useState("");
    const [glimpseDraft, setGlimpseDraft] = useState("");

    // Track previous agent to reset drafts
    const [prevAgentId, setPrevAgentId] = useState<Id<"agents"> | null>(null);
    const activeAgent = agents?.find((a: Agent) => a._id === selectedAgent);

    if (activeAgent && activeAgent._id !== prevAgentId) {
        setDossierDraft(activeAgent.biography || "");
        setGlimpseDraft(activeAgent.glimpseUrl || "");
        setPrevAgentId(activeAgent._id);
    }

    const updateAgent = useMutation((api as any).studio?.agents?.updateAgent ?? (() => { }));

    const handleSaveDossier = async () => {
        if (activeAgent && agentsApiAvailable) {
            await updateAgent({
                id: activeAgent._id,
                biography: dossierDraft,
                glimpseUrl: glimpseDraft
            });
        }
    };

    // Check if agents API is available
    const agentsApiAvailable = !!(api as any).studio?.agents;

    const handleToggleActive = async (agentId: Id<"agents">) => {
        if (agentsApiAvailable) {
            await toggleActive({ id: agentId });
        }
    };

    const handleAssignSpace = async (agentId: Id<"agents">, spaceId: Id<"scenes">) => {
        if (agentsApiAvailable) {
            await assignToSpace({ agentId, spaceId });
        }
        setIsAssigning(false);
        setSelectedAgent(null);
    };



    return (
        <div className="min-h-screen bg-[var(--deep-bg)] text-white font-mono p-0 -m-8 -mt-8">
            {/* CRT Scanlines Overlay */}
            <div className="fixed inset-0 pointer-events-none crt-scanlines z-50 opacity-30" />

            {/* Lava Lamp Ambient Glow */}
            <div
                className="fixed top-20 -left-20 w-64 h-64 bg-[var(--deep-glow)] rounded-full lava-glow -z-10"
                style={{ opacity: 0.15 }}
            />
            <div
                className="fixed bottom-20 -right-20 w-48 h-48 bg-[var(--deep-accent)] rounded-full lava-glow -z-10"
                style={{ opacity: 0.1 }}
            />

            {/* Header */}
            <header className="border-b border-[var(--deep-accent)]/30 p-6 bg-[var(--deep-bg)]">
                <div className="flex items-center gap-3">
                    <Terminal className="w-6 h-6 text-[var(--deep-accent)] terminal-glow" />
                    <h1 className="text-xl font-bold tracking-wider text-[var(--deep-accent)] terminal-glow">
                        AGENT MANAGER
                    </h1>
                    <span className="text-xs text-zinc-500 ml-4">// LUMINOUS DEEP v0.1.0</span>
                </div>
                <p className="text-sm text-zinc-500 mt-2 ml-9">
                    Managing {agents?.length ?? 0} registered agents across {spaces?.length ?? 0} spaces
                </p>
                {!agentsApiAvailable && (
                    <p className="text-xs text-amber-500 mt-2 ml-9">
                        ⚠ Waiting for Convex to regenerate API types. Run &apos;npx convex dev&apos; to sync.
                    </p>
                )}
            </header>

            <div className="flex">
                {/* Agent List Panel */}
                <div className="w-1/2 border-r border-[var(--deep-accent)]/20 p-6">
                    <div className="flex items-center gap-2 mb-6 text-zinc-400 text-xs uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        <span>Active Agents</span>
                    </div>

                    {!agents ? (
                        <div className="flex items-center gap-3 text-zinc-500">
                            <div className="w-4 h-4 border-2 border-[var(--deep-accent)]/50 border-t-[var(--deep-accent)] rounded-full animate-spin" />
                            <span>Loading agents...</span>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="terminal-panel p-6 text-center text-zinc-500">
                            <Cpu className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No agents registered</p>
                            <p className="text-xs mt-2">Run seedAll to initialize canonical agents</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agents.map((agent: Agent) => (
                                <AgentCard
                                    key={agent._id}
                                    agent={agent}
                                    isSelected={selectedAgent === agent._id}
                                    onSelect={() => setSelectedAgent(agent._id)}
                                    onToggleActive={() => handleToggleActive(agent._id)}
                                />
                            ))}
                        </div>
                    )}
                </div>



                {/* Agent Detail Panel */}
                <div className="w-1/2 p-6">
                    <div className="flex items-center gap-6 mb-6 text-xs uppercase tracking-widest border-b border-white/5 pb-4">
                        <button
                            onClick={() => setActiveTab("config")}
                            className={clsx(
                                "flex items-center gap-2 transition-colors",
                                activeTab === "config" ? "text-[var(--deep-accent)]" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Configuration</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("dossier")}
                            className={clsx(
                                "flex items-center gap-2 transition-colors",
                                activeTab === "dossier" ? "text-[var(--deep-accent)]" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Terminal className="w-4 h-4" />
                            <span>Dossier</span>
                        </button>
                    </div>

                    {activeAgent ? (
                        <div className="terminal-panel p-6 space-y-6">
                            {/* Agent Header - Always Visible */}
                            <div className="flex items-start justify-between border-b border-white/5 pb-4">
                                <div>
                                    <h2 className={clsx(
                                        "text-2xl font-bold tracking-wide",
                                        voiceColors[activeAgent.voice || "neutral"]
                                    )}>
                                        {activeAgent.name}
                                    </h2>
                                    <p className="text-zinc-500 text-sm mt-1">{activeAgent.role}</p>
                                </div>
                                <div className={clsx(
                                    "px-3 py-1 rounded text-xs uppercase tracking-wider",
                                    activeAgent.isActive
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                                )}>
                                    {activeAgent.isActive ? "ONLINE" : "OFFLINE"}
                                </div>
                            </div>

                            {activeTab === "config" ? (
                                <>
                                    {/* Description */}
                                    {activeAgent.description && (
                                        <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-[var(--deep-accent)]/30 pl-4">
                                            {activeAgent.description}
                                        </p>
                                    )}

                                    {/* Home Space */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                                            <MapPin className="w-3 h-3" />
                                            Home Space
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--deep-accent)]">
                                                {activeAgent.homeSpace?.title || "Unassigned"}
                                            </span>
                                            {!isAssigning ? (
                                                <button
                                                    onClick={() => setIsAssigning(true)}
                                                    className="text-xs text-zinc-500 hover:text-[var(--deep-accent)] transition-colors"
                                                >
                                                    [reassign]
                                                </button>
                                            ) : (
                                                <select
                                                    className="bg-[var(--deep-dim)] border border-[var(--deep-accent)]/30 rounded px-2 py-1 text-xs text-white"
                                                    onChange={(e) => handleAssignSpace(activeAgent._id, e.target.value as Id<"scenes">)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Select space...</option>
                                                    {spaces?.map((space: Space) => (
                                                        <option key={space._id} value={space._id}>
                                                            {space.title} ({space.domain})
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Autonomy Level */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                                            <Zap className="w-3 h-3" />
                                            Autonomy Level
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div
                                                    key={level}
                                                    className={clsx(
                                                        "w-8 h-2 rounded-full transition-all",
                                                        level <= activeAgent.autonomy
                                                            ? "bg-[var(--deep-glow)]"
                                                            : "bg-[var(--deep-dim)]"
                                                    )}
                                                />
                                            ))}
                                            <span className="text-xs text-[var(--deep-glow)] ml-2">
                                                {autonomyLabels[activeAgent.autonomy - 1]}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tools & Capabilities */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Capabilities</div>
                                            <div className="flex flex-wrap gap-2">
                                                {activeAgent.capabilities.map((cap: string) => (
                                                    <span key={cap} className="px-2 py-1 bg-[var(--deep-dim)] rounded text-xs text-zinc-300 border border-white/5">
                                                        {cap}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Tools</div>
                                            <div className="flex flex-wrap gap-2">
                                                {activeAgent.tools.map((tool: string) => (
                                                    <span key={tool} className="px-2 py-1 bg-[var(--deep-accent)]/10 rounded text-xs text-[var(--deep-accent)] border border-[var(--deep-accent)]/20">
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Glimpse URL Output */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <span>👻 Ghost Overlay URL</span>
                                            <span className="text-zinc-600 normal-case">(Background effect)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={glimpseDraft}
                                            onChange={(e) => setGlimpseDraft(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 focus:border-[var(--deep-accent)] focus:outline-none transition-colors"
                                        />
                                    </div>

                                    {/* Biography Editor */}
                                    <div className="space-y-2 h-[400px] flex flex-col">
                                        <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                                            <span>Start Logic / Biography</span>
                                            <span className="text-zinc-600">{dossierDraft.length} chars</span>
                                        </label>
                                        <textarea
                                            value={dossierDraft}
                                            onChange={(e) => setDossierDraft(e.target.value)}
                                            placeholder="Enter deep backstory, defining memories, and psychological profile here..."
                                            className="flex-1 bg-black/20 border border-white/10 rounded p-4 text-sm text-zinc-300 font-mono leading-relaxed focus:border-[var(--deep-accent)] focus:outline-none transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex justify-end pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleSaveDossier}
                                            className="px-4 py-2 bg-[var(--deep-accent)] hover:bg-[var(--deep-accent)]/80 text-black font-bold rounded text-xs uppercase tracking-wider transition-colors"
                                        >
                                            Save Dossier Protocol
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="terminal-panel p-12 text-center text-zinc-500">
                            <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Select an agent to view configuration</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AgentCard({
    agent,
    isSelected,
    onSelect,
    onToggleActive
}: {
    agent: Agent;
    isSelected: boolean;
    onSelect: () => void;
    onToggleActive: () => void;
}) {
    return (
        <div
            onClick={onSelect}
            className={clsx(
                "terminal-panel p-4 cursor-pointer transition-all duration-300",
                isSelected
                    ? "border-[var(--deep-accent)] bg-[var(--deep-accent)]/5"
                    : "hover:border-[var(--deep-accent)]/50"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Status Indicator */}
                    <div
                        className={clsx(
                            "w-2 h-2 rounded-full",
                            agent.isActive
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-zinc-600"
                        )}
                    />

                    {/* Agent Info */}
                    <div>
                        <h3 className={clsx(
                            "font-bold tracking-wide",
                            voiceColors[agent.voice || "neutral"]
                        )}>
                            {agent.name}
                        </h3>
                        <p className="text-xs text-zinc-500">
                            {agent.role} • {agent.homeSpace?.title || "Unassigned"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleActive();
                        }}
                        className={clsx(
                            "p-2 rounded transition-colors",
                            agent.isActive
                                ? "text-emerald-400 hover:bg-emerald-400/10"
                                : "text-zinc-500 hover:bg-zinc-500/10"
                        )}
                        title={agent.isActive ? "Deactivate" : "Activate"}
                    >
                        <Power className="w-4 h-4" />
                    </button>

                    {/* Chevron */}
                    <ChevronRight className={clsx(
                        "w-4 h-4 transition-all",
                        isSelected ? "text-[var(--deep-accent)]" : "text-zinc-600"
                    )} />
                </div>
            </div>
        </div>
    );
}
