"use client";
// Force rebuild for Vercel

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import clsx from "clsx";
import { Activity, Terminal, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

interface Run {
    _id: string;
    workflowName?: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    logs: Array<{
        timestamp: number;
        message: string;
        level: string;
    }>;
    startedAt: number;
    completedAt?: number;
}

const statusConfig = {
    pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", animate: false },
    running: { icon: Loader2, color: "text-sky-500", bg: "bg-sky-500/10", animate: true },
    completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", animate: false },
    failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", animate: false },
    cancelled: { icon: XCircle, color: "text-zinc-500", bg: "bg-zinc-500/10", animate: false },
};

function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelativeTime(ts: number, now: number): string {
    const diff = now - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

export default function StudioDashboard() {
    const packs = useQuery(api.studio.content.listPacks);
    const scenes = useQuery(api.studio.scenes.getAllScenes);
    const agents = useQuery(api.public.scenes.listAgents);
    const recentRuns = useQuery((api as any).studio?.runs?.getRecentRuns ?? api.studio.content.listPacks, { limit: 10 }) as Run[] | undefined;

    // Track current time for relative timestamps (client-side only to avoid hydration mismatch)
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 10000); // Update every 10s
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo(() => {
        if (!packs) return null;
        return {
            published: packs.filter((p: any) => p.status === "Published").length,
            review: packs.filter((p: any) => p.status === "Review").length,
            drafts: packs.filter((p: any) => p.status === "Draft").length
        };
    }, [packs]);

    // Check if runs API is available
    const runsApiAvailable = !!(api as any).studio?.runs;

    if (!packs || !scenes) {
        return <div className="p-10 text-gray-500 animate-pulse">Loading Studio Telemetry...</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Studio Command</h1>
                <p className="text-gray-500 mt-1">Luminous Deep Content Operations</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Published Reveals</div>
                    <div className="text-4xl font-black text-green-600 mt-2">{stats?.published || 0}</div>
                    <div className="mt-4 text-xs font-bold text-green-700 bg-green-50 inline-block px-2 py-1 rounded">
                        LIVE ON SITE
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-yellow-400">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Review Queue</div>
                    <div className="text-4xl font-black text-gray-900 mt-2">{stats?.review || 0}</div>
                    <div className="mt-4">
                        <Link href="/studio/content" className="text-sm font-bold text-indigo-600 hover:underline">
                            Process Queue &rarr;
                        </Link>
                    </div>
                </div>

                <Link href="/studio/content" className="group bg-indigo-600 p-6 rounded-xl shadow-md hover:bg-indigo-700 transition-all flex flex-col justify-center items-center text-center cursor-pointer">
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📥</span>
                    <span className="text-white font-bold text-lg">Import New Content</span>
                    <span className="text-indigo-200 text-xs mt-1">JSON Packs / Bulk Upload</span>
                </Link>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Agents</div>
                    <div className="text-4xl font-black text-indigo-600 mt-2">{agents?.length || 0}</div>
                    <div className="mt-4 text-xs font-bold text-indigo-700 bg-indigo-50 inline-block px-2 py-1 rounded">
                        AI CHARACTERS
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Scenes</div>
                    <div className="text-4xl font-black text-sky-600 mt-2">{scenes?.length || 0}</div>
                    <div className="mt-4 text-xs font-bold text-sky-700 bg-sky-50 inline-block px-2 py-1 rounded">
                        ROOMS IN HOUSE
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Draft Content</div>
                    <div className="text-4xl font-black text-amber-600 mt-2">{stats?.drafts || 0}</div>
                    <div className="mt-4 text-xs font-bold text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded">
                        IN PROGRESS
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Packs</div>
                    <div className="text-4xl font-black text-gray-600 mt-2">{packs?.length || 0}</div>
                    <div className="mt-4 text-xs font-bold text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
                        ALL CONTENT
                    </div>
                </div>
            </div>

            {/* Live System Feed */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center">
                            <Terminal className="w-4 h-4 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white">Live System Feed</h2>
                            <p className="text-xs text-gray-500">Agentic Telemetry</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs text-gray-400">MONITORING</span>
                    </div>
                </div>

                <div className="divide-y divide-gray-800 font-mono text-sm max-h-80 overflow-y-auto">
                    {!runsApiAvailable ? (
                        <div className="p-4 text-gray-500 text-center">
                            <p>Waiting for Convex to sync runs API...</p>
                            <p className="text-xs mt-1">Run Convex dev to see telemetry</p>
                        </div>
                    ) : !recentRuns || recentRuns.length === 0 ? (
                        <div className="p-6 text-gray-500 text-center">
                            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No recent activity</p>
                            <p className="text-xs mt-1">Use Magic Paste to generate telemetry</p>
                        </div>
                    ) : (
                        recentRuns.map((run) => {
                            const config = statusConfig[run.status];
                            const StatusIcon = config.icon;
                            const latestLog = run.logs[run.logs.length - 1];

                            return (
                                <div key={run._id} className="p-3 hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={clsx("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", config.bg)}>
                                            <StatusIcon className={clsx("w-3.5 h-3.5", config.color, config.animate && "animate-spin")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-300 font-medium truncate">
                                                    {run.workflowName || "Unknown Workflow"}
                                                </span>
                                                <span className={clsx("text-xs px-1.5 py-0.5 rounded uppercase tracking-wider", config.bg, config.color)}>
                                                    {run.status}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-xs mt-0.5 truncate">
                                                {latestLog?.message || "No logs"}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-600 flex-shrink-0">
                                            {now ? formatRelativeTime(run.startedAt, now) : "..."}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900">Scene Registry</h2>
                    <Link href="/studio/content" className="text-xs font-bold text-gray-400 hover:text-indigo-600">MANAGE ALL</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                    {(scenes || []).map((scene: any) => (
                        <div key={scene._id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="text-xs font-bold uppercase text-indigo-400 mb-1">{scene.domain}</div>
                            <div className="font-bold text-gray-800">{scene.title}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
