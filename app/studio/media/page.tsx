"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SyncMediaButton } from "@/components/studio/SyncMediaButton";
import React, { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { Star, Check, Copy, Anchor, X, User, Eye, Shirt, Lightbulb, Hand, MapPin, Wrench, Palette, Upload, Loader2, Terminal, Plus, Search, Zap, Layers, Gauge, Activity } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// IDENTITY ANCHOR SYSTEM: Character Lock for AI Generation
// 14 slots provide mathematical consistency for agent visuals
// ═══════════════════════════════════════════════════════════════

type Agent = "cassie" | "eleanor" | "julian";

const IDENTITY_SLOTS: Record<number, { name: string; icon: any; description: string }> = {
    1: { name: "Primary Face", icon: User, description: "The definitive front-facing portrait" },
    2: { name: "Side Profile", icon: Eye, description: "Three-quarter or profile view" },
    3: { name: "Contextual Style", icon: Palette, description: "Full-body or environment shot" },
    4: { name: "Expression A", icon: User, description: "Neutral/contemplative" },
    5: { name: "Expression B", icon: User, description: "Engaged/animated" },
    6: { name: "Expression C", icon: User, description: "Focused/working" },
    7: { name: "Hands Reference", icon: Hand, description: "Hand poses and gestures" },
    8: { name: "Wardrobe A", icon: Shirt, description: "Primary outfit reference" },
    9: { name: "Wardrobe B", icon: Shirt, description: "Secondary outfit reference" },
    10: { name: "Environment A", icon: MapPin, description: "Primary workspace" },
    11: { name: "Environment B", icon: MapPin, description: "Secondary location" },
    12: { name: "Props & Tools", icon: Wrench, description: "Character-specific items" },
    13: { name: "Lighting Ref", icon: Lightbulb, description: "Preferred lighting setup" },
    14: { name: "Style Guide", icon: Palette, description: "Overall aesthetic reference" },
};

const AGENT_COLORS: Record<Agent, { bg: string; border: string; text: string; accent: string }> = {
    cassie: { bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-300", accent: "#F59E0B" },
    eleanor: { bg: "bg-violet-500/20", border: "border-violet-500", text: "text-violet-300", accent: "#8B5CF6" },
    julian: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-300", accent: "#3B82F6" },
};

export default function MediaLibraryPage() {
    const media = useQuery(api.studio.mediaQueries.getAllMedia);
    const updateMedia = useMutation((api.studio.mediaQueries as any).updateMedia);
    const setIdentityAnchor = useMutation(api.studio.mediaQueries.setIdentityAnchor);
    const clearIdentityAnchor = useMutation(api.studio.mediaQueries.clearIdentityAnchor);
    const anchorSummary = useQuery(api.studio.mediaQueries.getIdentityAnchorSummary);

    const [search, setSearch] = useState("");
    const [filterVisualBible, setFilterVisualBible] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent>("eleanor");
    const [isSettingAnchor, setIsSettingAnchor] = useState(false);

    // Smart Ingest State (Optimized for High-Speed Fibre)
    const smartAgenticUploadAction = useAction(api.studio.ingestion.smartAgenticUpload);
    const [ingestLogs, setIngestLogs] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Multi-file Queue State (Fibre-Optimized)
    interface ActiveUpload {
        id: string;
        file: File;
        preview: string;
        status: "idle" | "analyzing" | "uploading" | "syncing" | "complete" | "error";
        agent?: Agent;
        progress: number;
        log?: string;
        bytesTransferred?: number;
    }
    const [uploadQueue, setUploadQueue] = useState<ActiveUpload[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);

    // Fibre Speed Metrics
    const [globalBytesTransferred, setGlobalBytesTransferred] = useState(0);
    const [totalBytesToUpload, setTotalBytesToUpload] = useState(0);
    const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
    const [currentSpeedMBps, setCurrentSpeedMBps] = useState(0);
    const terminalRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll terminal on new logs
    React.useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = 0; // Scroll to top (newest logs)
        }
    }, [ingestLogs]);

    if (media === undefined) return <div className="p-8 text-gray-500 animate-pulse">Loading Media Library...</div>;

    const filtered = media.filter((item: any) =>
        (item.publicId.toLowerCase().includes(search.toLowerCase()) ||
            (item.folder && item.folder.toLowerCase().includes(search.toLowerCase()))) &&
        (!filterVisualBible || item.isVisualBible === true)
    );

    const selectedItem = selectedMedia ? media.find((m: any) => m._id === selectedMedia) : null;

    const handleToggleVisualBible = async (id: Id<"media">, currentValue: boolean) => {
        try {
            await updateMedia({ id, isVisualBible: !currentValue });
        } catch (e) {
            console.error("Failed to update Visual Bible status:", e);
        }
    };

    const handleSetIdentityAnchor = async (slot: number) => {
        if (!selectedMedia) return;
        setIsSettingAnchor(true);
        try {
            await setIdentityAnchor({
                id: selectedMedia as Id<"media">,
                agent: selectedAgent,
                slot,
            });
            alert(`✅ Set as ${IDENTITY_SLOTS[slot].name} for ${selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)}`);
        } catch (e: any) {
            console.error("Failed to set identity anchor:", e);
            alert(`Failed to set anchor: ${e.message || e}`);
        } finally {
            setIsSettingAnchor(false);
        }
    };

    const handleClearIdentityAnchor = async () => {
        if (!selectedMedia) return;
        setIsSettingAnchor(true);
        try {
            await clearIdentityAnchor({ id: selectedMedia as Id<"media"> });
            alert("Identity Anchor cleared");
        } catch (e: any) {
            console.error("Failed to clear identity anchor:", e);
        } finally {
            setIsSettingAnchor(false);
        }
    };

    // ─── Smart Ingest Handlers ────────────────────────────────────
    // ─── Rate-Limited Processing (Gemini Vision requires cool-down) ───────────

    // Client-side thumbnail extraction for video (lightweight for analysis)
    const generateVideoThumbnail = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.currentTime = 1; // Capture at 1s mark

            video.onloadeddata = () => {
                // Ensure we have seeked enough
                if (video.duration < 1) video.currentTime = 0;
            };

            video.onseeked = () => {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
                } else {
                    reject(new Error("Canvas context failed"));
                }
                URL.revokeObjectURL(video.src);
            };

            video.onerror = (e) => reject(e);
        });
    };

    const processUpload = async (uploadId: string, file: File): Promise<void> => {
        // Guard: Check if this upload is already being processed or completed
        const existingUpload = uploadQueue.find(u => u.id === uploadId);
        if (existingUpload?.status === "complete" || existingUpload?.status === "uploading" || existingUpload?.status === "syncing") {
            console.log(`[GUARD] Skipping duplicate processing for ${file.name}`);
            return;
        }

        const fileSize = file.size;
        setUploadQueue(prev => prev.map(u => u.id === uploadId ? { ...u, status: "analyzing", progress: 10 } : u));
        setIngestLogs(prev => [`> [${new Date().toLocaleTimeString()}] SCANNING: ${file.name.toUpperCase()} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`, ...prev].slice(0, 100));

        try {
            // Convert to Base64 (High-speed transmit)
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
            });
            reader.readAsDataURL(file);
            const base64 = await base64Promise;

            // Video Handling: Extract Thumbnail for Analysis
            let thumbnailBase64: string | undefined;
            if (file.type.startsWith("video/")) {
                try {
                    thumbnailBase64 = await generateVideoThumbnail(file);
                    setIngestLogs(prev => [`> [${new Date().toLocaleTimeString()}] 🎬 VIDEO DETECTED: Generated thumb for Gemini analysis`, ...prev].slice(0, 100));
                } catch (e) {
                    console.warn("Failed to generate video thumbnail:", e);
                }
            }

            setUploadQueue(prev => prev.map(u => u.id === uploadId ? { ...u, status: "uploading", progress: 40 } : u));

            const result = await smartAgenticUploadAction({
                imageBase64: base64,
                thumbnailBase64: thumbnailBase64,
                mimeType: file.type,
            });

            // Track bytes transferred for speed calculation
            setGlobalBytesTransferred(prev => prev + fileSize);

            if (result.success) {
                setUploadQueue(prev => prev.map(u => u.id === uploadId ? {
                    ...u,
                    status: "complete",
                    agent: result.agent as Agent,
                    progress: 100,
                    bytesTransferred: fileSize
                } : u));

                setIngestLogs(prev => [
                    `✓ [${new Date().toLocaleTimeString()}] ${result.agent?.toUpperCase()} LOCKED → Slot ${String(result.slot).padStart(2, "0")} (${result.role})`,
                    ...prev
                ].slice(0, 100));

                // Task 4: Clear completed item from queue after 2 seconds
                setTimeout(() => {
                    setUploadQueue(prev => prev.filter(u => u.id !== uploadId));
                }, 2000);
            }
        } catch (error: any) {
            const errorMsg = error.message || "Unknown error";

            // Task 3: Detect rate limit / quota errors
            const isRateLimit = errorMsg.toLowerCase().includes("rate") ||
                errorMsg.toLowerCase().includes("quota") ||
                errorMsg.toLowerCase().includes("429") ||
                errorMsg.toLowerCase().includes("limit");

            setUploadQueue(prev => prev.map(u => u.id === uploadId ? { ...u, status: "error", log: errorMsg } : u));

            if (isRateLimit) {
                setIngestLogs(prev => [
                    `✗ [${new Date().toLocaleTimeString()}] API Congestion detected. Pausing for 2 seconds...`,
                    `✗ [${new Date().toLocaleTimeString()}] ERROR: ${file.name.toUpperCase()} - ${errorMsg}`,
                    ...prev
                ].slice(0, 100));
                // Wait 2 seconds before continuing
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                setIngestLogs(prev => [
                    `✗ [${new Date().toLocaleTimeString()}] ERROR: ${file.name.toUpperCase()} - ${errorMsg}`,
                    ...prev
                ].slice(0, 100));
            }
        }
    };

    // P-Limit style chunked concurrency with cool-down for API rate limits
    const CONCURRENCY_LIMIT = 3; // Optimized for Fibre Video Ingest
    const COOL_DOWN_MS = 1500; // 1.5 second delay between files for Gemini Vision

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const processWithConcurrencyLimit = async (uploads: ActiveUpload[], limit: number): Promise<void> => {
        const queue = [...uploads];
        const executing: Promise<void>[] = [];

        while (queue.length > 0 || executing.length > 0) {
            while (executing.length < limit && queue.length > 0) {
                const upload = queue.shift()!;

                // Add cool-down delay before starting each new upload
                if (executing.length > 0 || queue.length < uploads.length - 1) {
                    setIngestLogs(prev => [`> SYSTEM: Cool-down... (${COOL_DOWN_MS}ms between files)`, ...prev].slice(0, 100));
                    await delay(COOL_DOWN_MS);
                }

                const promise = processUpload(upload.id, upload.file).then(() => {
                    executing.splice(executing.indexOf(promise), 1);
                });
                executing.push(promise);
            }
            if (executing.length > 0) {
                await Promise.race(executing);
            }
        }
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/")).slice(0, 50); // Allow up to 50 files
        if (newFiles.length === 0) return;

        const totalBytes = newFiles.reduce((sum, f) => sum + f.size, 0);
        const newUploads: ActiveUpload[] = newFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            status: "idle" as const,
            progress: 0,
        }));

        setUploadQueue(prev => [...newUploads, ...prev]);
        setTotalBytesToUpload(prev => prev + totalBytes);
        setTransferStartTime(Date.now());
        setGlobalBytesTransferred(0);
        setIsProcessingQueue(true);

        setIngestLogs(prev => [
            `> ═══════════════════════════════════════════════════`,
            `> BATCH INGEST: ${newFiles.length} files (${(totalBytes / 1024 / 1024).toFixed(2)} MB total)`,
            `> CONCURRENCY: ${CONCURRENCY_LIMIT}-way parallel streams active`,
            `> ═══════════════════════════════════════════════════`,
            ...prev
        ].slice(0, 100));

        // Speed calculation interval
        const speedInterval = setInterval(() => {
            if (transferStartTime) {
                const elapsed = (Date.now() - transferStartTime) / 1000;
                if (elapsed > 0) {
                    setCurrentSpeedMBps(globalBytesTransferred / 1024 / 1024 / elapsed);
                }
            }
        }, 250);

        // FIBRE OPTIMIZED: Process with concurrency limit
        await processWithConcurrencyLimit(newUploads, CONCURRENCY_LIMIT);

        clearInterval(speedInterval);
        setIsProcessingQueue(false);
        setIngestLogs(prev => [
            `✓ ═══════════════════════════════════════════════════`,
            `✓ BATCH COMPLETE: ${newFiles.length} files ingested`,
            `✓ ═══════════════════════════════════════════════════`,
            ...prev
        ].slice(0, 100));
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
                    <p className="text-gray-500 text-sm">Manage assets synced from Cloudinary • Identity Anchors power AI consistency</p>
                </div>
                <div className="flex gap-2">
                    <SyncMediaButton />
                </div>
            </header>

            {/* Identity Anchor Summary - DNA Strength Dashboard */}
            {anchorSummary && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Anchor className="w-6 h-6 text-violet-400" />
                            <div>
                                <h3 className="font-bold text-lg">DNA Strength</h3>
                                <p className="text-xs text-gray-400">Identity Anchor slots determine AI generation consistency</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-violet-400">{anchorSummary.total} / 42</div>
                            <div className="text-xs text-gray-400">Total Anchors</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {(["cassie", "eleanor", "julian"] as Agent[]).map(agent => {
                            const filled = anchorSummary[agent] || 0;
                            const percentage = Math.round((filled / 14) * 100);
                            const strength = filled >= 10 ? "STRONG" : filled >= 5 ? "MODERATE" : filled >= 1 ? "WEAK" : "EMPTY";
                            const strengthColor = filled >= 10 ? "text-emerald-400" : filled >= 5 ? "text-yellow-400" : filled >= 1 ? "text-orange-400" : "text-red-400";

                            return (
                                <div key={agent} className={clsx(
                                    "rounded-xl p-4 border backdrop-blur-sm",
                                    AGENT_COLORS[agent].bg,
                                    AGENT_COLORS[agent].border
                                )}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={clsx("font-bold capitalize text-lg", AGENT_COLORS[agent].text)}>
                                            {agent}
                                        </div>
                                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full bg-black/30", strengthColor)}>
                                            {strength}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: AGENT_COLORS[agent].accent
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-white">{filled}</span>
                                        <span className="text-sm text-gray-400">/ 14 slots</span>
                                    </div>

                                    {filled < 3 && (
                                        <p className="text-xs text-gray-500 mt-2 italic">
                                            Upload LD_BIBLE_{agent.toUpperCase()}_01 to start
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Upload Hint */}
                    <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-violet-400">💡</span>
                            <span className="text-gray-300">
                                <strong>Auto-Sync:</strong> Upload files named <code className="bg-black/30 px-1 rounded">LD_BIBLE_JULIAN_01</code> to Cloudinary, then click Sync. The system will auto-assign Identity Anchors and extract AI tags.
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* FIBRE SPEED DASHBOARD - Global Progress & Transfer Speed */}
            {isProcessingQueue && (
                <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-2xl p-6 border border-violet-500/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center animate-pulse">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Fibre Transfer Active</h3>
                                <p className="text-xs text-violet-300">10-way concurrent streams optimized for high-speed connection</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2">
                                <Gauge className="w-5 h-5 text-emerald-400" />
                                <span className="text-3xl font-black text-emerald-400 tabular-nums">
                                    {currentSpeedMBps.toFixed(1)}
                                </span>
                                <span className="text-sm text-emerald-300">MB/s</span>
                            </div>
                        </div>
                    </div>

                    {/* Global Progress Bar */}
                    <div className="relative h-4 bg-black/40 rounded-full overflow-hidden mb-3">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{
                                width: `${totalBytesToUpload > 0 ? (globalBytesTransferred / totalBytesToUpload) * 100 : 0}%`
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-violet-300">
                            {(globalBytesTransferred / 1024 / 1024).toFixed(2)} MB / {(totalBytesToUpload / 1024 / 1024).toFixed(2)} MB transferred
                        </span>
                        <span className="text-fuchsia-300 font-bold">
                            {uploadQueue.filter(u => u.status === "complete").length} / {uploadQueue.filter(u => u.status !== "idle" || u.progress > 0).length} complete
                        </span>
                    </div>
                </div>
            )}

            {/* Agentic Ingest - Smart Dropzone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={clsx(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] cursor-pointer group",
                        isDragging
                            ? "border-violet-500 bg-violet-500/5 ring-4 ring-violet-500/20"
                            : "border-slate-300 hover:border-violet-400 hover:bg-slate-50"
                    )}
                    onClick={() => document.getElementById("file-upload")?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handleFileSelect}
                    />

                    <div className={clsx(
                        "w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                        isProcessingQueue ? "bg-violet-500 animate-pulse" : "bg-slate-100 group-hover:bg-violet-100"
                    )}>
                        {isProcessingQueue ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-violet-500" />
                        )}
                    </div>

                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Agentic Ingest</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                            {isProcessingQueue
                                ? "Gemini Vision analyzing streams... 10-way parallel active."
                                : "Drop up to 50 images. Fibre-optimized 10-way concurrent upload."}
                        </p>
                    </div>

                    {/* Active Overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center rounded-2xl">
                            <div className="bg-white px-6 py-3 rounded-full shadow-xl font-bold text-violet-600 flex items-center gap-2">
                                <Plus /> Drop to Identify Character
                            </div>
                        </div>
                    )}
                </div>

                {/* Terminal Logs */}
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 font-mono text-sm overflow-hidden flex flex-col min-h-[300px]">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Ingest Terminal</span>
                        <div className="flex gap-1.5 ml-auto">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        </div>
                    </div>

                    <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                        {ingestLogs.length > 0 ? (
                            ingestLogs.map((log, i) => (
                                <div
                                    key={i}
                                    className={clsx(
                                        "transition-all duration-300 text-left",
                                        log.startsWith("> SYSTEM") ? "text-blue-400" :
                                            log.startsWith("> JULIAN") ? "text-blue-300" :
                                                log.startsWith("> ELEANOR") ? "text-violet-300" :
                                                    log.startsWith("> CASSIE") ? "text-amber-300" :
                                                        log.includes("✓") ? "text-emerald-400 font-bold" :
                                                            log.includes("✗") ? "text-red-400 font-bold" : "text-slate-300"
                                    )}
                                >
                                    {log}
                                </div>
                            ))
                        ) : (
                            <div className="text-slate-600 italic">Waiting for input stream...</div>
                        )}
                        {isProcessingQueue && (
                            <div className="text-emerald-400 animate-pulse text-left">_</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Concurrent Upload Queue - The Radar */}
            {uploadQueue.length > 0 && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-violet-500" />
                            <h3 className="font-bold text-slate-800">Active Ingest Queue</h3>
                            <span className="bg-violet-100 text-violet-600 text-xs px-2 py-0.5 rounded-full font-bold">
                                {uploadQueue.filter(u => u.status === "complete").length} / {uploadQueue.length} Ready
                            </span>
                        </div>
                        {uploadQueue.every(u => u.status === "complete" || u.status === "error") && (
                            <button
                                onClick={() => setUploadQueue([])}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                                Clear Ingest Queue
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {uploadQueue.map(upload => (
                            <div key={upload.id} className="relative group">
                                <div className={clsx(
                                    "aspect-square rounded-xl overflow-hidden border-2 transition-all duration-500 relative",
                                    upload.status === "complete"
                                        ? `shadow-lg ${AGENT_COLORS[upload.agent!].border}`
                                        : upload.status === "error" ? "border-red-400" : "border-slate-200"
                                )}>
                                    <img
                                        src={upload.preview}
                                        className={clsx(
                                            "w-full h-full object-cover transition-all duration-700",
                                            upload.status === "analyzing" || upload.status === "uploading" ? "scale-110 blur-[1px]" : "scale-100"
                                        )}
                                        alt="preview"
                                    />

                                    {/* Video Indicator */}
                                    {upload.file.type.startsWith("video/") && (
                                        <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded backdrop-blur-sm z-10">
                                            <Activity className="w-3 h-3" />
                                        </div>
                                    )}

                                    {/* The Radar: Scanning Animation */}
                                    {(upload.status === "analyzing" || upload.status === "uploading") && (
                                        <div className="absolute inset-0 bg-violet-500/10 pointer-events-none">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-violet-400/80 shadow-[0_0_15px_rgba(167,139,250,0.8)] animate-scan" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Zap className="w-6 h-6 text-white animate-pulse" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Success/Identity Overlay */}
                                    {upload.status === "complete" && (
                                        <div className={clsx(
                                            "absolute inset-0 flex flex-col items-center justify-center p-2 text-center",
                                            AGENT_COLORS[upload.agent!].bg,
                                            "backdrop-blur-[2px]"
                                        )}>
                                            <div className="bg-white rounded-full p-1.5 mb-1 shadow-md">
                                                <Check className={clsx("w-3 h-3", AGENT_COLORS[upload.agent!].text.replace("text-", "text-").replace("-300", "-600"))} />
                                            </div>
                                            <span className={clsx("text-[10px] font-black uppercase tracking-tighter", AGENT_COLORS[upload.agent!].text)}>
                                                {upload.agent}
                                            </span>
                                        </div>
                                    )}

                                    {/* Error Overlay */}
                                    {upload.status === "error" && (
                                        <div className="absolute inset-0 bg-red-500/80 backdrop-blur-md flex items-center justify-center p-2 text-center">
                                            <X className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Individual Progress Bar */}
                                {upload.status !== "complete" && upload.status !== "error" && (
                                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 transition-all duration-300"
                                            style={{ width: `${upload.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4 items-center">
                <input
                    type="text"
                    placeholder="Search media by ID or folder..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    onClick={() => setFilterVisualBible(!filterVisualBible)}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        filterVisualBible
                            ? "bg-yellow-500 text-yellow-900"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                >
                    <Star className={clsx("w-4 h-4", filterVisualBible && "fill-yellow-900")} />
                    Visual Bible Only
                </button>
            </div>

            {/* Visual Bible Info Banner */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-200" />
                    <div>
                        <h3 className="font-bold text-yellow-800">Visual Bible & Identity Anchors</h3>
                        <p className="text-sm text-yellow-700">
                            Click any asset to open the <strong>Identity Anchor</strong> panel. Assign it to one of 14 slots
                            for Julian, Eleanor, or Cassie to create a mathematical "Character Lock" for AI generation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Layout: Grid + Sidebar */}
            <div className="flex gap-6">
                {/* Grid */}
                <div className={clsx(
                    "grid gap-4 transition-all",
                    selectedMedia ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 flex-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full"
                )}>
                    {filtered.map((item: any) => (
                        <div
                            key={item._id}
                            onClick={() => setSelectedMedia(selectedMedia === item._id ? null : item._id)}
                            className={clsx(
                                "bg-white border rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer",
                                selectedMedia === item._id
                                    ? "ring-2 ring-violet-500 border-violet-500"
                                    : (item as any).isVisualBible
                                        ? "border-yellow-400 ring-2 ring-yellow-200"
                                        : "border-gray-200"
                            )}
                        >
                            <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                                {item.resourceType === 'video' ? (
                                    <video
                                        src={item.url}
                                        className="w-full h-full object-cover"
                                        muted
                                        loop
                                        playsInline
                                        onMouseOver={e => e.currentTarget.play()}
                                        onMouseOut={e => e.currentTarget.pause()}
                                    />
                                ) : (
                                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" alt={item.publicId} />
                                )}

                                {/* Identity Anchor Badge */}
                                {(item as any).identityAgent && (
                                    <div className={clsx(
                                        "absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1",
                                        AGENT_COLORS[(item as any).identityAgent as Agent]?.bg,
                                        AGENT_COLORS[(item as any).identityAgent as Agent]?.text
                                    )}>
                                        <Anchor className="w-3 h-3" />
                                        {IDENTITY_SLOTS[(item as any).identitySlot]?.name || "Anchor"}
                                    </div>
                                )}

                                {/* Visual Bible Badge (if not identity anchor) */}
                                {(item as any).isVisualBible && !(item as any).identityAgent && (
                                    <div className="absolute top-2 left-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-900" />
                                        BIBLE
                                    </div>
                                )}

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.url);
                                            alert("URL Copied!");
                                        }}
                                        className="p-2 bg-white text-black rounded-lg hover:bg-gray-200"
                                        title="Copy URL"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleVisualBible(item._id, (item as any).isVisualBible || false);
                                        }}
                                        className={clsx(
                                            "p-2 rounded-lg transition-colors",
                                            (item as any).isVisualBible
                                                ? "bg-yellow-500 text-yellow-900"
                                                : "bg-white text-gray-800 hover:bg-yellow-100"
                                        )}
                                        title={`${(item as any).isVisualBible ? "Remove from" : "Add to"} Visual Bible`}
                                    >
                                        <Star className={clsx("w-4 h-4", (item as any).isVisualBible && "fill-yellow-900")} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-3 text-xs">
                                <div className="font-bold truncate text-gray-800" title={item.publicId}>{item.publicId}</div>
                                <div className="text-gray-500 truncate mt-1">{item.folder || "Root"}</div>
                                <div className="text-gray-400 mt-2 flex justify-between items-center bg-gray-50 p-1 rounded">
                                    <span className="uppercase">{item.format}</span>
                                    <span>{item.width}x{item.height}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Identity Anchor Sidebar */}
                {selectedItem && (
                    <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 text-white sticky top-4 h-fit">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Anchor className="w-5 h-5 text-violet-400" />
                                <h3 className="font-bold">Identity Anchor</h3>
                            </div>
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg overflow-hidden mb-4 border border-white/10">
                            <img src={selectedItem.url} alt={selectedItem.publicId} className="w-full aspect-square object-cover" />
                        </div>

                        <div className="text-xs text-gray-400 truncate mb-4">
                            {selectedItem.publicId}
                        </div>

                        {/* Current Anchor Status */}
                        {(selectedItem as any).identityAgent && (
                            <div className={clsx(
                                "mb-4 p-3 rounded-lg border",
                                AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.bg,
                                AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.border
                            )}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={clsx("font-bold capitalize", AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.text)}>
                                            {(selectedItem as any).identityAgent}
                                        </div>
                                        <div className="text-xs text-gray-300">
                                            Slot {(selectedItem as any).identitySlot}: {IDENTITY_SLOTS[(selectedItem as any).identitySlot]?.name}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClearIdentityAnchor}
                                        disabled={isSettingAnchor}
                                        className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded hover:bg-red-500/40"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Agent Selector */}
                        <div className="mb-4">
                            <div className="text-xs text-gray-400 mb-2">Select Agent</div>
                            <div className="flex gap-2">
                                {(["cassie", "eleanor", "julian"] as Agent[]).map(agent => (
                                    <button
                                        key={agent}
                                        onClick={() => setSelectedAgent(agent)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                                            selectedAgent === agent
                                                ? `${AGENT_COLORS[agent].bg} ${AGENT_COLORS[agent].border} border-2`
                                                : "bg-white/5 hover:bg-white/10"
                                        )}
                                        style={selectedAgent === agent ? { borderColor: AGENT_COLORS[agent].accent } : {}}
                                    >
                                        {agent}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary Slots */}
                        <div className="space-y-2 mb-4">
                            <div className="text-xs text-gray-400">Primary Slots</div>
                            {[1, 2, 3].map(slot => {
                                const SlotIcon = IDENTITY_SLOTS[slot].icon;
                                return (
                                    <button
                                        key={slot}
                                        onClick={() => handleSetIdentityAnchor(slot)}
                                        disabled={isSettingAnchor}
                                        className={clsx(
                                            "w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left",
                                            "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500",
                                            "disabled:opacity-50"
                                        )}
                                    >
                                        <SlotIcon className="w-5 h-5" />
                                        <div>
                                            <div className="font-bold text-sm">{IDENTITY_SLOTS[slot].name}</div>
                                            <div className="text-xs text-white/70">{IDENTITY_SLOTS[slot].description}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Extended Slots (Collapsible) */}
                        <details className="group">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors mb-2">
                                ▶ Extended Slots (4-14)
                            </summary>
                            <div className="space-y-1 mt-2 max-h-64 overflow-y-auto">
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(slot => {
                                    const SlotIcon = IDENTITY_SLOTS[slot].icon;
                                    return (
                                        <button
                                            key={slot}
                                            onClick={() => handleSetIdentityAnchor(slot)}
                                            disabled={isSettingAnchor}
                                            className={clsx(
                                                "w-full p-2 rounded-lg flex items-center gap-2 transition-all text-left text-sm",
                                                "bg-white/5 hover:bg-white/10",
                                                "disabled:opacity-50"
                                            )}
                                        >
                                            <SlotIcon className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{IDENTITY_SLOTS[slot].name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </details>
                    </div>
                )}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    No media found. Try syncing or check your search.
                </div>
            )}
        </div>
    );
}
