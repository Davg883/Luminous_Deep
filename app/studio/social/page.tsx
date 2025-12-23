"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getHighResSocialUrl, getDownloadUrl } from "@/lib/cloudinary-utils";

// ═══════════════════════════════════════════════════════════════
// SOCIAL COMMAND CENTRE
// Multi-platform campaign planner with AI-powered content generation
// ═══════════════════════════════════════════════════════════════

type Platform = "X" | "Instagram" | "Facebook" | "LinkedIn";
type CampaignStatus = "planning" | "generated" | "scheduled" | "posted";

const PLATFORM_CONFIG: Record<Platform, {
    icon: string;
    color: string;
    charLimit: number;
    aspectRatio: string;
    description: string;
}> = {
    X: {
        icon: "𝕏",
        color: "#000000",
        charLimit: 280,
        aspectRatio: "16:9",
        description: "Short, punchy updates with visual impact"
    },
    Instagram: {
        icon: "📸",
        color: "#E4405F",
        charLimit: 2200,
        aspectRatio: "1:1",
        description: "Visual-first storytelling with rich captions"
    },
    Facebook: {
        icon: "📘",
        color: "#1877F2",
        charLimit: 63206,
        aspectRatio: "1.91:1",
        description: "Community engagement and longer narratives"
    },
    LinkedIn: {
        icon: "💼",
        color: "#0A66C2",
        charLimit: 3000,
        aspectRatio: "1.91:1",
        description: "Professional thought leadership"
    },
};

const STATUS_BADGES: Record<CampaignStatus, { label: string; color: string }> = {
    planning: { label: "Planning", color: "bg-amber-500/20 text-amber-300" },
    generated: { label: "Generated", color: "bg-blue-500/20 text-blue-300" },
    scheduled: { label: "Scheduled", color: "bg-purple-500/20 text-purple-300" },
    posted: { label: "Posted", color: "bg-emerald-500/20 text-emerald-300" },
};

// Agent voice colour mapping
const VOICE_COLORS: Record<string, string> = {
    cassie: "#F59E0B",   // Amber - energetic workshop
    eleanor: "#8B5CF6",  // Violet - poetic study
    julian: "#3B82F6",   // Blue - technical boathouse
    sparkline: "#10B981", // Emerald - data
    hearth: "#EF4444",    // Red - warmth
    systems: "#6B7280",   // Gray - neutral sys
    neutral: "#6366F1",   // Indigo - default
};

export default function SocialStudioPage() {
    // ─── State ───────────────────────────────────────────────────
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("X");
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [campaignTitle, setCampaignTitle] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"create" | "campaigns">("create");
    const [anchorsUsed, setAnchorsUsed] = useState<number>(0);
    const [copyAnchorsUsed, setCopyAnchorsUsed] = useState<number>(0);
    const [currentRunId, setCurrentRunId] = useState<Id<"runs"> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // ─── Queries ─────────────────────────────────────────────────
    const agents = useQuery(api.studio.agents.listAgents);
    const visualBibleUrls = useQuery(api.studio.mediaQueries.getVisualBibleAssets, {});
    const anchorSummary = useQuery(api.studio.mediaQueries.getIdentityAnchorSummary);

    // ─── Actions ─────────────────────────────────────────────────
    const generateSocialPost = useAction(api.studio.ai.generateSocialPost);
    const generateNanoBananaAsset = useAction(api.studio.imaging.generateNanoBananaAsset);

    // Archive Mutations & Queries
    const campaigns = useQuery(api.studio.socialQueries.listCampaigns);
    const saveCampaign = useMutation(api.studio.socialQueries.saveCampaign);
    const updateStatus = useMutation(api.studio.socialQueries.updateCampaignStatus);
    const resonate = useMutation(api.studio.socialQueries.resonateCampaign);

    // ─── Derived Data ────────────────────────────────────────────
    const selectedAgentData = useMemo(() => {
        if (!agents || !selectedAgent) return null;
        return agents.find((a: any) => a._id === selectedAgent);
    }, [agents, selectedAgent]);

    // Visual Bible URLs (shared across all agents for now)
    const agentVisualBible = visualBibleUrls || [];

    // ─── Handlers ────────────────────────────────────────────────
    const handleGenerateCopy = async () => {
        if (!selectedAgentData || !campaignTitle) {
            alert("Please select an agent and enter a campaign title.");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateSocialPost({
                platform: selectedPlatform,
                agentId: selectedAgentData.voice || "neutral", // Pass voice, not _id
                topic: campaignTitle,
                charLimit: PLATFORM_CONFIG[selectedPlatform].charLimit,
            });
            setGeneratedCopy(result.copy);
            setCopyAnchorsUsed(result.dnaAnchorsUsed || 0);
            if (result.runId) setCurrentRunId(result.runId);
        } catch (error: any) {
            console.error("Generation error:", error);
            alert(`Failed to generate copy: ${error.message || "Unknown error"}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCampaign = async () => {
        if (!generatedCopy || !selectedAgent || !campaignTitle) return;

        setIsSaving(true);
        try {
            await saveCampaign({
                title: campaignTitle,
                platform: selectedPlatform,
                agentId: selectedAgent as Id<"agents">,
                postCopy: generatedCopy,
                imageUrl: generatedImage || undefined,
                runId: currentRunId || undefined,
                dnaAnchorsUsed: anchorsUsed > 0 ? anchorsUsed : copyAnchorsUsed,
            });

            // Switch to archive tab and clear state
            setActiveTab("campaigns");
            setGeneratedCopy(null);
            setGeneratedImage(null);
            setCampaignTitle("");
            setCurrentRunId(null);
        } catch (e: any) {
            console.error("Save failed:", e);
            alert("Failed to save campaign");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (id: Id<"campaigns">, currentStatus: string) => {
        const newStatus = currentStatus === "posted" ? "generated" : "posted";
        await updateStatus({ campaignId: id, status: newStatus as any });
    };

    const handleGenerateImage = async () => {
        if (!selectedAgentData || !campaignTitle) {
            alert("Please select an agent and enter a campaign title.");
            return;
        }

        setIsGenerating(true);
        try {
            const aspectRatio = PLATFORM_CONFIG[selectedPlatform].aspectRatio;
            const result = await generateNanoBananaAsset({
                prompt: `Create a ${selectedPlatform} post image for: ${campaignTitle}. Style: ${selectedAgentData.voice} voice, professional social media aesthetic.`,
                agentVoice: selectedAgentData.voice as "cassie" | "eleanor" | "julian",
                sceneSlug: campaignTitle.toLowerCase().replace(/\s+/g, "-"),
                aspectRatio: aspectRatio.includes("16:9") ? "16x9" :
                    aspectRatio.includes("1:1") ? "1x1" : "16x9",
            });
            setGeneratedImage(result.imageUrl);
            setAnchorsUsed(result.anchorsUsed || 0);
        } catch (error: any) {
            console.error("Image generation error:", error);
            alert(`Failed to generate image: ${error.message || "Unknown error"}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                                Social Command Centre
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">
                                AI-powered multi-platform content generation
                            </p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab("create")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "create"
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                ✨ Create
                            </button>
                            <button
                                onClick={() => setActiveTab("campaigns")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "campaigns"
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                📋 Campaigns
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === "create" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Configuration */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Platform Selector */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">
                                    📡 Platform
                                </h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platform) => (
                                        <button
                                            key={platform}
                                            onClick={() => setSelectedPlatform(platform)}
                                            className={`p-4 rounded-xl text-center transition-all ${selectedPlatform === platform
                                                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/30 scale-105"
                                                : "bg-slate-700/50 hover:bg-slate-700 border border-white/5"
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">
                                                {PLATFORM_CONFIG[platform].icon}
                                            </span>
                                            <span className="text-sm font-medium">{platform}</span>
                                            <span className="text-xs text-slate-400 block mt-1">
                                                {PLATFORM_CONFIG[platform].charLimit} chars
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-4 text-center">
                                    {PLATFORM_CONFIG[selectedPlatform].description}
                                </p>
                            </div>

                            {/* Agent Selector */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">
                                    🎭 Voice
                                </h2>
                                {agents ? (
                                    <div className="space-y-2">
                                        {agents.map((agent: any) => (
                                            <button
                                                key={agent._id}
                                                onClick={() => setSelectedAgent(agent._id)}
                                                className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${selectedAgent === agent._id
                                                    ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-violet-500/50"
                                                    : "bg-slate-700/30 hover:bg-slate-700/50 border border-white/5"
                                                    }`}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                                                    style={{
                                                        backgroundColor: VOICE_COLORS[agent.voice || "neutral"] || "#6366f1"
                                                    }}
                                                >
                                                    {agent.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <span className="font-medium block">
                                                        {agent.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {agent.voice}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-center py-4">
                                        Loading agents...
                                    </div>
                                )}
                            </div>

                            {/* DNA Lock Indicator - Task 2 */}
                            {selectedAgentData && anchorSummary && (() => {
                                const voice = selectedAgentData.voice || "julian";
                                const anchorCount = (anchorSummary as Record<string, number>)[voice] || 0;
                                return (
                                    <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 rounded-2xl p-4 border border-violet-500/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🧬</span>
                                                <div>
                                                    <span className="text-sm font-semibold text-white">DNA Lock</span>
                                                    <p className="text-xs text-slate-400">Character Consistency</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-2xl font-bold ${anchorCount >= 10 ? "text-emerald-400" :
                                                    anchorCount >= 5 ? "text-amber-400" :
                                                        anchorCount > 0 ? "text-orange-400" :
                                                            "text-slate-500"
                                                    }`}>
                                                    {anchorCount}/14
                                                </span>
                                                <p className="text-xs text-slate-400">Anchors Active</p>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${anchorCount >= 10 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                                                    anchorCount >= 5 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                                        "bg-gradient-to-r from-orange-500 to-orange-400"
                                                    }`}
                                                style={{ width: `${anchorCount / 14 * 100}%` }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500 text-center">
                                            {anchorCount >= 10
                                                ? "✓ Strong identity lock - Output will be 100% on-brand"
                                                : anchorCount >= 5
                                                    ? "⚠ Moderate lock - Add more anchors for consistency"
                                                    : "⚠ Weak lock - Upload more Visual Bible assets"}
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Visual Bible Preview */}
                            {selectedAgentData && (
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                    <h2 className="text-lg font-semibold mb-4 text-slate-200">
                                        📖 Visual Bible
                                    </h2>
                                    {agentVisualBible.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {agentVisualBible.slice(0, 6).map((url: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="aspect-square rounded-lg overflow-hidden border border-white/10"
                                                >
                                                    <img
                                                        src={url}
                                                        alt="Visual Bible asset"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No Visual Bible assets for {selectedAgentData.name} yet.
                                            <br />
                                            <span className="text-xs">
                                                Add images in the Media Library.
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Generation */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Campaign Title */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                <h2 className="text-lg font-semibold mb-4 text-slate-200">
                                    📝 Campaign Brief
                                </h2>
                                <input
                                    type="text"
                                    value={campaignTitle}
                                    onChange={(e) => setCampaignTitle(e.target.value)}
                                    placeholder="e.g., The London Infrastructure Keynote"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleGenerateCopy}
                                        disabled={isGenerating || !selectedAgent || !campaignTitle}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? "⏳ Generating..." : "⚡ Broadcast Copy"}
                                    </button>
                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={isGenerating || !selectedAgent || !campaignTitle}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? "⏳ Generating..." : "📸 Broadcast Image"}
                                    </button>
                                </div>
                            </div>

                            {/* Generated Content Preview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Copy Output */}
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-slate-200">
                                            📄 Generated Copy
                                        </h2>
                                        {generatedCopy && (
                                            <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                                                {generatedCopy.length} / {PLATFORM_CONFIG[selectedPlatform].charLimit}
                                            </span>
                                        )}
                                    </div>
                                    {generatedCopy ? (
                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 min-h-[200px]">
                                            <p className="text-slate-300 whitespace-pre-wrap">
                                                {generatedCopy}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/30 rounded-xl p-4 border border-dashed border-slate-700 min-h-[200px] flex items-center justify-center">
                                            <p className="text-slate-600 text-center">
                                                Generated copy will appear here
                                            </p>
                                        </div>
                                    )}
                                    {generatedCopy && (
                                        <button
                                            onClick={() => navigator.clipboard.writeText(generatedCopy)}
                                            className="mt-3 w-full py-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                        >
                                            📋 Copy to Clipboard
                                        </button>
                                    )}
                                </div>

                                {/* Image Output */}
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-slate-200">
                                            🖼️ Generated Image
                                        </h2>
                                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded-full">
                                            {PLATFORM_CONFIG[selectedPlatform].aspectRatio}
                                        </span>
                                    </div>
                                    {generatedImage ? (
                                        <div className="rounded-xl overflow-hidden border border-white/10">
                                            <img
                                                src={generatedImage}
                                                alt="Generated social media image"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="bg-slate-900/30 rounded-xl border border-dashed border-slate-700 flex items-center justify-center"
                                            style={{
                                                aspectRatio: PLATFORM_CONFIG[selectedPlatform].aspectRatio.replace(":", "/")
                                            }}
                                        >
                                            <p className="text-slate-600 text-center px-4">
                                                Generated image will appear here
                                            </p>
                                        </div>
                                    )}
                                    {generatedImage && (
                                        <div className="mt-3 space-y-2">
                                            {/* DNA Lock Status */}
                                            {anchorsUsed > 0 && (
                                                <div className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm ${anchorsUsed >= 10 ? "bg-emerald-500/20 text-emerald-300" :
                                                    anchorsUsed >= 5 ? "bg-amber-500/20 text-amber-300" :
                                                        "bg-orange-500/20 text-orange-300"
                                                    }`}>
                                                    <span>🧬</span>
                                                    <span>Identity Lock: {anchorsUsed}/14 Anchors Active</span>
                                                </div>
                                            )}

                                            {/* 4K Master Download */}
                                            <a
                                                href={getDownloadUrl(
                                                    getHighResSocialUrl(generatedImage, selectedPlatform),
                                                    `LD_${selectedAgentData?.voice || "social"}_${selectedPlatform}_4K`
                                                )}
                                                download
                                                className="block w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg text-sm font-medium text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all text-center shadow-lg shadow-violet-500/25"
                                            >
                                                ⬇️ Download 4K Master
                                            </a>

                                            {/* Open Full Size */}
                                            <a
                                                href={generatedImage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full py-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors text-center"
                                            >
                                                🔗 Open Full Size
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Platform Preview */}
                            {(generatedCopy || generatedImage) && (
                                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-semibold text-slate-200">
                                                👀 Platform Preview
                                            </h2>
                                            {/* Platform Badge */}
                                            <span
                                                className="px-3 py-1 rounded-full text-sm font-bold border"
                                                style={{
                                                    backgroundColor: `${PLATFORM_CONFIG[selectedPlatform].color}20`,
                                                    borderColor: `${PLATFORM_CONFIG[selectedPlatform].color}50`,
                                                    color: PLATFORM_CONFIG[selectedPlatform].color === "#000000" ? "#fff" : PLATFORM_CONFIG[selectedPlatform].color
                                                }}
                                            >
                                                {PLATFORM_CONFIG[selectedPlatform].icon} {selectedPlatform}
                                            </span>
                                        </div>
                                        {/* Brand Fidelity Indicator */}
                                        {generatedImage && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${anchorsUsed >= 10
                                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                : anchorsUsed >= 5
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                    : anchorsUsed > 0
                                                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                                        : "bg-slate-700 text-slate-400"
                                                }`}>
                                                <span>🧬</span>
                                                <span>Character Lock: {anchorsUsed}/14 Anchors</span>
                                                {anchorsUsed >= 10 && <span className="text-emerald-400">✓</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="rounded-xl p-4 border"
                                        style={{
                                            borderColor: PLATFORM_CONFIG[selectedPlatform].color + "40",
                                            backgroundColor: PLATFORM_CONFIG[selectedPlatform].color + "10"
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: VOICE_COLORS[selectedAgentData?.voice || "neutral"] || "#6366f1" }}
                                            >
                                                {selectedAgentData?.name?.[0] || "?"}
                                            </div>
                                            <div>
                                                <span className="font-semibold block">
                                                    {selectedAgentData?.name || "Agent"}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    @{selectedAgentData?.voice || "voice"}
                                                </span>
                                            </div>
                                            <span className="ml-auto text-xl">
                                                {PLATFORM_CONFIG[selectedPlatform].icon}
                                            </span>
                                        </div>
                                        {generatedImage && (
                                            <img
                                                src={generatedImage}
                                                alt="Preview"
                                                className="w-full rounded-lg mb-3"
                                            />
                                        )}
                                        {generatedCopy && (
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                                {generatedCopy}
                                            </p>
                                        )}
                                    </div>

                                    {/* SAVE ACTION */}
                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleSaveCampaign}
                                            disabled={isSaving}
                                            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            {isSaving ? "Saving..." : "💾 Save to Archive"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {
                    activeTab === "campaigns" && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                                <h2 className="text-2xl font-bold">📋 Campaign Archive</h2>
                                <div className="text-sm text-slate-400">
                                    {campaigns ? `${campaigns.length} Records Found` : "Loading..."}
                                </div>
                            </div>

                            {campaigns === undefined ? (
                                <div className="text-center py-20 text-slate-500">Loading Archive...</div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-center py-20 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                    No campaigns archived yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {campaigns.map((campaign: any) => (
                                        <div key={campaign._id} className="bg-slate-800/40 rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group">
                                            {/* Header */}
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                                        style={{ backgroundColor: VOICE_COLORS[campaign.agentVoice] || "#6366f1" }}
                                                    >
                                                        {campaign.agentName?.[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{campaign.title}</span>
                                                        <span className="text-xs text-slate-400">{new Date(campaign._creationTime).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="px-2 py-0.5 rounded text-xs font-bold border"
                                                        style={{
                                                            backgroundColor: `${PLATFORM_CONFIG[campaign.platform as Platform]?.color}20`,
                                                            borderColor: `${PLATFORM_CONFIG[campaign.platform as Platform]?.color}40`,
                                                            color: PLATFORM_CONFIG[campaign.platform as Platform]?.color === "#000000" ? "#ccc" : PLATFORM_CONFIG[campaign.platform as Platform]?.color
                                                        }}
                                                    >
                                                        {PLATFORM_CONFIG[campaign.platform as Platform]?.icon}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleStatus(campaign._id, campaign.status)}
                                                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${STATUS_BADGES[campaign.status as CampaignStatus]?.color
                                                            } hover:opacity-80`}
                                                    >
                                                        {STATUS_BADGES[campaign.status as CampaignStatus]?.label}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Image Content */}
                                            {campaign.imageUrl && (
                                                <div className="relative aspect-video bg-black/50 overflow-hidden group-hover:opacity-100 transition-opacity">
                                                    <img
                                                        src={getHighResSocialUrl(campaign.imageUrl, campaign.platform)}
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                        alt="Campaign Visual"
                                                    />
                                                    {/* Overlay Actions */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <a
                                                            href={getDownloadUrl(getHighResSocialUrl(campaign.imageUrl, campaign.platform), `LD_Archive_${campaign._id}_4K`)}
                                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm backdrop-blur-md transition-colors"
                                                            download
                                                        >
                                                            ⬇ 4K Download
                                                        </a>
                                                        {campaign.runId && (
                                                            <a
                                                                href={`/luminous-deep`}
                                                                className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/40 text-violet-200 rounded-lg text-sm backdrop-blur-md border border-violet-500/30 transition-colors"
                                                            >
                                                                📡 Telemetry
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Copy Content */}
                                            <div className="p-4">
                                                <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-6 font-mono bg-black/20 p-3 rounded-lg border border-white/5">
                                                    {campaign.postCopy}
                                                </p>

                                                <div className="mt-4 flex items-center justify-between">
                                                    {/* DNA Strength */}
                                                    <div className="flex items-center gap-1.5 opacity-50 text-xs">
                                                        <span>🧬</span>
                                                        <span>DNA Strength: {((campaign.dnaAnchorsUsed || 0) / 14 * 100).toFixed(0)}%</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {campaign.status !== "posted" && (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await resonate({ campaignId: campaign._id });
                                                                    } catch (e) {
                                                                        console.error("Resonance failed:", e);
                                                                    }
                                                                }}
                                                                className="text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 px-3 py-1.5 rounded-md border border-indigo-500/30 transition-colors flex items-center gap-1"
                                                            >
                                                                📡 Resonate
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(campaign.postCopy || "")}
                                                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-transparent hover:border-white/10 px-2 py-1 rounded"
                                                        >
                                                            📋 Copy Text
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }
            </main >
        </div >
    );
}
