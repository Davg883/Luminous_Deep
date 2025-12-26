"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import GlitchGate from "@/components/narrative/GlitchGate";
import { Loader2 } from "lucide-react";

export default function SignalReaderPage() {
    const params = useParams();
    // Ensure slug is a string
    const slug = typeof params?.slug === 'string' ? params.slug : null;

    const signal = useQuery(api.public.signals.getSignal, slug ? { slug } : "skip");

    if (signal === undefined) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-emerald-900/50">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-mono text-xs tracking-widest uppercase">Acquiring Signal...</span>
                </div>
            </div>
        );
    }

    if (signal === null) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-600">
                <div className="text-center font-mono space-y-4">
                    <div className="text-4xl">404</div>
                    <div className="text-xs uppercase tracking-[0.2em]">Signal Lost</div>
                    <div className="text-[10px] bg-stone-900 p-2 rounded text-stone-500">
                        Target: {slug}
                    </div>
                    <a href="/sanctuary/library/reader" className="text-xs text-emerald-600 hover:text-emerald-500 underline">
                        Return to Archive
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-serif selection:bg-emerald-900/30 selection:text-emerald-50">
            {/* Cinematic Header */}
            <div className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
                <div className="max-w-prose mx-auto flex justify-between items-center font-mono text-[10px] text-emerald-600/60 uppercase tracking-widest">
                    <span>// INCOMING TRANSMISSION...</span>
                    <span>SIGNAL STRENGTH: 84%</span>
                </div>
            </div>

            <main className="max-w-prose mx-auto px-6 py-20">
                <article>
                    <header className="mb-12 text-center">
                        <div className="font-mono text-xs text-stone-500 mb-4 uppercase tracking-[0.2em]">
                            Season {signal.season} • Episode {signal.episode}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-stone-100 to-stone-500 mb-6 font-serif">
                            {signal.title}
                        </h1>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-900/50 to-transparent mx-auto" />
                    </header>

                    <div className="prose prose-invert prose-stone prose-lg max-w-none">
                        <GlitchGate
                            content={signal.content}
                            isLocked={signal.isLocked}
                            glitchPoint={signal.glitchPoint}
                        />
                    </div>
                </article>
            </main>

            {/* Footer / Status */}
            <footer className="py-12 text-center border-t border-white/5 mt-20">
                <div className="font-mono text-[10px] text-stone-700 uppercase tracking-widest">
                    End of Transmission
                </div>
            </footer>
        </div>
    );
}
