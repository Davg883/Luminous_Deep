"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Shield,
    Plus,
    Save,
    Lock,
    FileText,
    AlertTriangle,
    User,
    Archive,
    CheckCircle2,
    Clock,
    Hash,
} from "lucide-react";

// Status badge component
function StatusPill({ status }: { status: "draft" | "active" | "retired" }) {
    const styles = {
        draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        retired: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    const icons = {
        draft: <Clock className="w-2.5 h-2.5" />,
        active: <CheckCircle2 className="w-2.5 h-2.5" />,
        retired: <Archive className="w-2.5 h-2.5" />,
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase border ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
}

// Agent color theming
const agentColors: Record<string, { accent: string; bg: string; border: string }> = {
    julian: { accent: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    thea: { accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    eleanor: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
    cassie: { accent: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
    default: { accent: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
};

function getAgentColor(agentId: string) {
    return agentColors[agentId.toLowerCase()] || agentColors.default;
}

export default function CanonVaultPage() {
    const [activeTab, setActiveTab] = useState<"worldCanon" | "mandates">("worldCanon");

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-slate-200 font-sans selection:bg-amber-500/30">
            {/* Main Container */}
            <div className="flex-1 flex flex-col">
                {/* Header with Tab Navigation */}
                <header className="border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-amber-500/10 rounded-xl">
                                <Shield className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Canon Vault</h1>
                                <p className="text-xs text-slate-500 font-mono">Governance Registry • Immutable Authority</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 gap-1">
                        <button
                            onClick={() => setActiveTab("worldCanon")}
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${activeTab === "worldCanon"
                                    ? "bg-amber-500/10 text-amber-400 border-t border-l border-r border-amber-500/30"
                                    : "text-slate-500 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Shield className="w-3.5 h-3.5 inline-block mr-2" />
                            World Canon
                        </button>
                        <button
                            onClick={() => setActiveTab("mandates")}
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${activeTab === "mandates"
                                    ? "bg-blue-500/10 text-blue-400 border-t border-l border-r border-blue-500/30"
                                    : "text-slate-500 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <User className="w-3.5 h-3.5 inline-block mr-2" />
                            Agent Mandates
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === "worldCanon" ? <WorldCanonEditor /> : <AgentMandateEditor />}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// WORLD CANON EDITOR (existing functionality)
// ═══════════════════════════════════════════════════════════════

function WorldCanonEditor() {
    const canonList = useQuery(api.studio.world.listCanon);
    const publishCanon = useMutation(api.studio.world.publishCanon);

    const [selectedId, setSelectedId] = useState<Id<"canon_vault"> | null>(null);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        if (selectedId && canonList) {
            const canon = canonList.find(c => c._id === selectedId);
            if (canon) {
                setTitle(canon.title);
                setSlug(canon.slug);
                setContent(canon.content);
            }
        } else if (!selectedId) {
            setTitle("");
            setSlug("");
            setContent("# New Canon Rule\n\nDefine the immutable world rule here...");
        }
    }, [selectedId, canonList]);

    const generateSlug = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTitle(val);
        if (!selectedId) setSlug(generateSlug(val));
    };

    const handleSave = async () => {
        if (!title || !content) {
            setSaveMessage("✗ Title and content required");
            return;
        }
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await publishCanon({ id: selectedId || undefined, title, slug, content });
            setSaveMessage("✓ Canon Rule Inscribed!");
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (e: any) {
            setSaveMessage(`✗ ${e.message || "Failed to save"}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-72 border-r border-amber-500/10 flex flex-col bg-gradient-to-b from-amber-950/10 to-transparent">
                <div className="p-4">
                    <button
                        onClick={() => setSelectedId(null)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 text-xs uppercase tracking-wider text-amber-600 hover:text-amber-400"
                    >
                        <Plus className="w-4 h-4" />
                        Inscribe New Rule
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                    {canonList?.map((canon) => (
                        <button
                            key={canon._id}
                            onClick={() => setSelectedId(canon._id)}
                            className={`w-full p-3 rounded-lg border text-left ${selectedId === canon._id
                                    ? "bg-amber-500/20 border-amber-500/50"
                                    : "bg-white/[0.02] border-white/5 hover:border-amber-500/20"
                                }`}
                        >
                            <h3 className="text-sm font-medium text-white mb-1 line-clamp-1">{canon.title}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-600 font-mono">v{canon.version || 1}</span>
                                <Lock className="w-2.5 h-2.5 text-amber-500/50" />
                            </div>
                        </button>
                    ))}
                    {canonList?.length === 0 && (
                        <div className="text-center py-12 text-amber-900/50">
                            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-[10px] font-mono uppercase">The Vault Awaits</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Editor */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-amber-500/10">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-amber-500" />
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Canon Inscriber</h2>
                            <span className="text-xs text-amber-600/50 font-mono">{slug || "untitled-rule"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveMessage && <span className={`text-xs font-mono ${saveMessage.startsWith('✓') ? 'text-amber-400' : 'text-rose-400'}`}>{saveMessage}</span>}
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded text-xs font-bold uppercase tracking-wider">
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Inscribing...' : 'Inscribe'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 p-4 border-r border-amber-500/10 space-y-4">
                        <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-600/80 leading-relaxed">
                                    Canon forms the immutable foundation. Changes ripple through all narratives.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-mono text-amber-600/50 uppercase mb-1">Title</label>
                            <input type="text" value={title} onChange={handleTitleChange} placeholder="e.g., The Light Cycle" className="w-full bg-white/5 border border-amber-500/20 rounded p-2 text-sm focus:border-amber-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-mono text-amber-600/50 uppercase mb-1">Slug</label>
                            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-white/5 border border-amber-500/20 rounded p-2 text-xs font-mono focus:border-amber-500/50 focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col bg-white/[0.01]">
                        <div className="p-4 border-b border-amber-500/10">
                            <h3 className="text-xl font-serif text-white">{title || "New Canon Rule"}</h3>
                        </div>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none font-serif text-base leading-relaxed text-slate-300" placeholder="Define the immutable truth..." />
                    </div>
                </div>
            </main>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// AGENT MANDATE EDITOR
// ═══════════════════════════════════════════════════════════════

function AgentMandateEditor() {
    const mandateList = useQuery(api.studio.mandates.listMandates);
    const agentsList = useQuery(api.studio.agents.listAgents);
    const publishMandate = useMutation(api.studio.mandates.publishMandate);
    const retireMandate = useMutation(api.studio.mandates.retireMandate);

    const [selectedId, setSelectedId] = useState<Id<"agent_mandates"> | null>(null);
    const [agentId, setAgentId] = useState("");
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const selectedMandate = mandateList?.find(m => m._id === selectedId);
    const color = getAgentColor(agentId);

    useEffect(() => {
        if (selectedId && mandateList) {
            const mandate = mandateList.find(m => m._id === selectedId);
            if (mandate) {
                setAgentId(mandate.agentId);
                setTitle(mandate.title);
                setSlug(mandate.slug);
                setContent(mandate.content);
            }
        } else if (!selectedId) {
            setAgentId("");
            setTitle("");
            setSlug("");
            setContent("# Operational Mandate\n\n## Core Purpose\n\n[Define the agent's primary function]\n\n## Behavioral Constraints\n\n[What the agent must never do]\n\n## Operating Parameters\n\n[How the agent should respond]");
        }
    }, [selectedId, mandateList]);

    const generateSlug = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTitle(val);
        if (!selectedId) setSlug(generateSlug(val));
    };

    const handleSave = async () => {
        if (!agentId || !title || !content) {
            setSaveMessage("✗ Agent, title, and content required");
            return;
        }
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await publishMandate({
                agentId,
                title,
                slug,
                content,
                createdBy: "admin", // TODO: Get from auth
                publishedBy: "admin",
            });
            setSaveMessage("✓ Mandate Inscribed!");
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (e: any) {
            setSaveMessage(`✗ ${e.message || "Failed to save"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRetire = async () => {
        if (!selectedId) return;
        const reason = prompt("Enter reason for retirement:");
        if (!reason) return;

        try {
            await retireMandate({ id: selectedId, reason, retiredBy: "admin" });
            setSaveMessage("✓ Mandate Retired");
            setSelectedId(null);
        } catch (e: any) {
            alert(`Cannot retire: ${e.message}`);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-72 border-r border-blue-500/10 flex flex-col bg-gradient-to-b from-blue-950/10 to-transparent">
                <div className="p-4">
                    <button
                        onClick={() => setSelectedId(null)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10 text-xs uppercase tracking-wider text-blue-600 hover:text-blue-400"
                    >
                        <Plus className="w-4 h-4" />
                        New Mandate
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                    {mandateList?.map((mandate) => {
                        const c = getAgentColor(mandate.agentId);
                        return (
                            <button
                                key={mandate._id}
                                onClick={() => setSelectedId(mandate._id)}
                                className={`w-full p-3 rounded-lg border text-left ${selectedId === mandate._id
                                        ? `${c.bg} ${c.border}`
                                        : "bg-white/[0.02] border-white/5 hover:border-blue-500/20"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-white mb-1 line-clamp-1">{mandate.title}</h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-mono uppercase ${c.accent}`}>{mandate.agentId}</span>
                                            <StatusPill status={mandate.status} />
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-600 font-mono shrink-0">v{mandate.version}</span>
                                </div>
                            </button>
                        );
                    })}
                    {mandateList?.length === 0 && (
                        <div className="text-center py-12 text-blue-900/50">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-[10px] font-mono uppercase">No Mandates Inscribed</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Editor */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-blue-500/10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color.bg}`}>
                            <User className={`w-5 h-5 ${color.accent}`} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                {selectedMandate ? `🔒 MANDATE — ${agentId.toUpperCase()}` : "New Agent Mandate"}
                            </h2>
                            <span className="text-xs text-blue-600/50 font-mono">{slug || "untitled-mandate"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveMessage && <span className={`text-xs font-mono ${saveMessage.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{saveMessage}</span>}

                        {selectedMandate?.status === "active" && (
                            <button onClick={handleRetire} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded text-xs font-bold uppercase tracking-wider">
                                <Archive className="w-4 h-4" />
                                Retire
                            </button>
                        )}

                        <button onClick={handleSave} disabled={isSaving || selectedMandate?.status === "retired"} className={`flex items-center gap-2 px-5 py-2 rounded text-xs font-bold uppercase tracking-wider ${color.bg} ${color.accent} ${color.border} border hover:opacity-80 disabled:opacity-50`}>
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Inscribing...' : 'Inscribe'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-72 p-4 border-r border-blue-500/10 space-y-4 overflow-y-auto">
                        {/* Warning Banner */}
                        <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-400/80 leading-relaxed">
                                    This mandate defines how the agent perceives, reasons, and responds. Changes affect all future outputs.
                                </p>
                            </div>
                        </div>

                        {/* Agent Selector */}
                        <div>
                            <label className="block text-[10px] font-mono text-blue-600/50 uppercase mb-1">Agent</label>
                            <select
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
                                disabled={!!selectedId}
                                className="w-full bg-white/5 border border-blue-500/20 rounded p-2 text-sm focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                            >
                                <option value="">Select Agent...</option>
                                {agentsList?.map(agent => (
                                    <option key={agent._id} value={agent.name.toLowerCase()}>{agent.name}</option>
                                ))}
                                <option value="thea">Thea</option>
                                <option value="julian">Julian</option>
                                <option value="eleanor">Eleanor</option>
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-[10px] font-mono text-blue-600/50 uppercase mb-1">Mandate Title</label>
                            <input type="text" value={title} onChange={handleTitleChange} placeholder="e.g., Julian Operational Mandate" className="w-full bg-white/5 border border-blue-500/20 rounded p-2 text-sm focus:border-blue-500/50 focus:outline-none" />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-[10px] font-mono text-blue-600/50 uppercase mb-1">Slug</label>
                            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-white/5 border border-blue-500/20 rounded p-2 text-xs font-mono focus:border-blue-500/50 focus:outline-none" />
                        </div>

                        {/* Metadata (if editing) */}
                        {selectedMandate && (
                            <div className="p-3 bg-black/40 rounded border border-blue-500/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-blue-600/50 font-mono uppercase">Version</span>
                                    <span className="text-sm font-bold text-blue-400">{selectedMandate.version}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-blue-600/50 font-mono uppercase">Status</span>
                                    <StatusPill status={selectedMandate.status} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Hash className="w-3 h-3 text-blue-500/30" />
                                    <span className="text-[9px] text-blue-600/40 font-mono">{selectedMandate.checksum?.slice(0, 8)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor Panel */}
                    <div className="flex-1 flex flex-col bg-white/[0.01]">
                        <div className="p-4 border-b border-blue-500/10">
                            <h3 className="text-xl font-serif text-white">{title || "New Mandate"}</h3>
                            <p className="text-[10px] text-blue-600/50 font-mono mt-1">Define the agent's constitution in Markdown</p>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={selectedMandate?.status === "retired"}
                            className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-300 disabled:opacity-50"
                            placeholder="# Operational Mandate&#10;&#10;Define the agent's governing instructions..."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
