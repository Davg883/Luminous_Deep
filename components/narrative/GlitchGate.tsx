import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface GlitchGateProps {
    content: string;
    isLocked: boolean;
    glitchPoint?: number;
}

export default function GlitchGate({ content, isLocked, glitchPoint }: GlitchGateProps) {
    if (!isLocked || !glitchPoint || content.length <= glitchPoint) {
        return (
            <div className="prose prose-invert prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-300">
                <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        );
    }

    const safeText = content.slice(0, glitchPoint);
    const corruptedLines = [
        "§±‡˜‰ 0xERR_BF9... CONNECTION SEVERED",
        "SYSTEM HALT: UNKNOWN PROTOCOL DETECTED",
        "††† ...RE-ROUTING... FAILED..."
    ];

    return (
        <div className="relative">
            {/* Safe Readable Text */}
            <div className="prose prose-invert prose-stone max-w-none font-serif text-lg leading-relaxed text-stone-300 mb-4">
                {safeText}
                <span className="inline-block w-2 h-4 align-middle bg-emerald-500 animate-pulse ml-1" />
            </div>

            {/* Corrupted Zone */}
            <div className="relative overflow-hidden p-8 border border-neutral-800 bg-neutral-900/50 rounded-lg backdrop-blur-sm min-h-[350px]">
                <div className="absolute inset-0 bg-repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 0, 0, 0.3) 2px,
                    rgba(0, 0, 0, 0.3) 4px
                ) pointer-events-none opacity-50"></div>

                {corruptedLines.map((line, i) => (
                    <div key={i} className="font-mono text-xs text-red-900/40 blur-[1px] select-none mb-1">
                        {line}
                    </div>
                ))}

                {/* The Glass Panel Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-6 border border-rose-900/30 bg-black/80 rounded-xl shadow-2xl max-w-sm"
                    >
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-rose-500/10 rounded-full border border-rose-500/20">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                        </div>

                        <h3 className="text-xl font-mono font-bold text-rose-500 tracking-widest mb-2">SIGNAL LOST</h3>
                        <p className="text-stone-500 text-xs font-mono mb-6 uppercase tracking-wider">Transmission Interrupted</p>

                        <button
                            onClick={() => alert("Payment Gateway Integration Pending")}
                            className="w-full py-3 px-4 bg-rose-950/50 border border-rose-500 text-rose-400 font-mono text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 hover:bg-rose-900/80 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all animate-pulse"
                        >
                            [ RESTORE FEED // £0.99 ]
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
