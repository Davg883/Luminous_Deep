"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useMemo } from "react";

export default function StudioDashboard() {
    const packs = useQuery(api.studio.content.listPacks);
    const scenes = useQuery(api.studio.scenes.getAllScenes);

    const stats = useMemo(() => {
        if (!packs) return null;
        return {
            published: packs.filter((p: any) => p.status === "Published").length,
            review: packs.filter((p: any) => p.status === "Review").length,
            drafts: packs.filter((p: any) => p.status === "Draft").length
        };
    }, [packs]);

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

