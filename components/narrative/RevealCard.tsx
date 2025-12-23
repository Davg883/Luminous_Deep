"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { XMarkIcon, Cog6ToothIcon, MapIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { RevealType, Domain } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";

type TruthMode = "factual" | "creative";

interface RevealCardProps {
    title: string;
    content: string;
    type: RevealType;
    domain?: Domain;
    isOpen: boolean;
    onClose: () => void;
    mediaUrl?: string;
    isEmbedded?: boolean;
    truthMode?: TruthMode; // NEW: Distinguishes factual vs creative artefacts
}

const contentVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.5,
            delayChildren: 0.3
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, filter: "blur(10px)", y: 10 },
    visible: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: { duration: 1.2, ease: "easeOut" }
    }
};

// Custom Motion Components to fix Type Mismatches with ReactMarkdown
const MotionParagraph = ({ children, ...props }: any) => (
    <motion.p variants={itemVariants} {...props}>
        {children}
    </motion.p>
);

const MotionH1 = ({ children, ...props }: any) => <motion.h1 variants={itemVariants} {...props}>{children}</motion.h1>;
const MotionH2 = ({ children, ...props }: any) => <motion.h2 variants={itemVariants} {...props}>{children}</motion.h2>;
const MotionH3 = ({ children, ...props }: any) => <motion.h3 variants={itemVariants} {...props}>{children}</motion.h3>;
const MotionLi = ({ children, ...props }: any) => <motion.li variants={itemVariants} {...props}>{children}</motion.li>;

export default function RevealCard({
    title,
    content,
    type,
    domain = "workshop",
    isOpen,
    onClose,
    mediaUrl,
    isEmbedded = false,
    truthMode
}: RevealCardProps) {
    // Determine truthMode styling
    const isFactual = truthMode === "factual";
    const isCreative = truthMode === "creative";
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCanClose(false);
            const timer = setTimeout(() => setCanClose(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (Only show if NOT embedded) */}
                    {!isEmbedded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => canClose && onClose()}
                            className={clsx(
                                "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-cursor",
                                canClose ? "cursor-pointer" : "cursor-wait"
                            )}
                        />
                    )}

                    {/* Card */}
                    <motion.div
                        initial={isEmbedded ? { opacity: 0, scale: 0.95 } : { y: "100%", opacity: 0 }}
                        animate={isEmbedded ? { opacity: 1, scale: 1 } : { y: 0, opacity: 1 }}
                        exit={isEmbedded ? { opacity: 0, scale: 0.95 } : { y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={clsx(
                            isEmbedded ? "relative w-full h-full flex flex-col shadow-none rounded-xl" : "fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 rounded-sm shadow-2xl flex flex-col max-h-[70vh]",
                            "overflow-hidden",
                            // Eleanor (Study): Journal Aesthetic
                            domain === "study" && "bg-[#fcfaf2] text-stone-900 font-serif border-2 border-amber-900/10 shadow-[4px_4px_0px_rgba(44,28,20,0.1)]",
                            // Julian (Boathouse): Technical Log
                            domain === "boathouse" && "bg-stone-950 text-sky-100 font-mono border-l-4 border-sky-600 shadow-2xl ring-1 ring-white/10",
                            // Cassie (Workshop): Draft Aesthetic
                            domain === "workshop" && "bg-white text-stone-800 font-sans border border-stone-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] rotate-1",
                            // Home: Neutral Glass
                            domain === "home" && "bg-white/90 backdrop-blur-md text-driftwood border border-white/20",
                            // Luminous Deep (Control Room): Terminal Aesthetic
                            domain === "luminous-deep" && "bg-[var(--deep-bg)] text-[var(--deep-text)] font-mono border border-[var(--deep-accent)]/40 shadow-[0_0_40px_rgba(14,165,233,0.2)]",
                            // TruthMode Overrides for Luminous Deep (High-Fidelity Artefact Preview)
                            // Factual: Technical Schematic - Blueprint lines, precise, documented
                            domain === "luminous-deep" && isFactual && "!bg-[#0a1628] !text-sky-300 !border-2 !border-sky-500/60 !ring-2 !ring-sky-500/20",
                            // Creative: Draft Note - Post-it style, Cassie's voice, atmospheric
                            domain === "luminous-deep" && isCreative && "!bg-amber-50 !text-stone-800 !font-sans !border-2 !border-amber-300 !shadow-[4px_4px_0px_rgba(217,119,6,0.3)] !rotate-1",
                            // Generic TruthMode Overrides (for other domains)
                            domain !== "luminous-deep" && isFactual && "!border-2 !border-sky-500/50 !ring-2 !ring-sky-500/20",
                            domain !== "luminous-deep" && isCreative && "!border !border-amber-400/30 !ring-1 !ring-amber-400/10"
                        )}
                        style={{
                            // Additional truthMode glow effects
                            ...(isFactual && domain === "luminous-deep" && {
                                boxShadow: "0 0 30px rgba(14, 165, 233, 0.25), 0 4px 30px rgba(0, 0, 0, 0.2)",
                                backgroundImage: "linear-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.03) 1px, transparent 1px)",
                                backgroundSize: "20px 20px"
                            }),
                            ...(isCreative && domain === "luminous-deep" && {
                                boxShadow: "4px 4px 0px rgba(217, 119, 6, 0.3), 0 4px 30px rgba(0, 0, 0, 0.1)"
                            }),
                            ...(isFactual && domain !== "luminous-deep" && { boxShadow: "0 0 20px rgba(14, 165, 233, 0.15), 0 4px 30px rgba(0, 0, 0, 0.1)" }),
                            ...(isCreative && domain !== "luminous-deep" && { boxShadow: "0 0 30px rgba(245, 158, 11, 0.2), 0 4px 30px rgba(0, 0, 0, 0.1)" }),
                        }}
                    >
                        {/* Dwell Progress Bar */}
                        <div className="h-1 bg-current opacity-10 w-full absolute top-0 left-0 z-10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 3, ease: "linear" }}
                                className="h-full bg-current opacity-50"
                            />
                        </div>

                        {/* Header */}
                        <div className="p-6 pb-0 flex-shrink-0">
                            <div className="flex justify-between items-start mb-4 border-b border-current/10 pb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className={clsx("text-lg font-bold tracking-tight", domain === "boathouse" && "uppercase tracking-widest text-xs")}>
                                        {title}
                                    </h3>
                                    {/* TruthMode Badge */}
                                    {truthMode && (
                                        <span className={clsx(
                                            "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full",
                                            isFactual && "bg-sky-500/20 text-sky-400 border border-sky-500/30",
                                            isCreative && "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        )}>
                                            {truthMode}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={!canClose}
                                    className={clsx(
                                        "p-1 transition-all duration-500",
                                        canClose ? "opacity-100 hover:opacity-50 cursor-pointer" : "opacity-20 cursor-wait"
                                    )}
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className={clsx(
                            "flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar",
                            "prose prose-sm max-w-none",
                            domain === "study" && "prose-p:text-stone-800 prose-headings:font-serif",
                            domain === "boathouse" && "prose-p:text-sky-100/80 prose-headings:text-sky-400 prose-code:text-sky-300",
                            domain === "workshop" && "prose-p:text-stone-600 prose-strong:text-orange-600"
                        )}>
                            {/* Media Handler */}
                            <motion.div variants={itemVariants} className="w-full">
                                {mediaUrl && (
                                    <div className="mb-4 rounded-lg overflow-hidden border border-current/10 bg-black/5 shadow-inner">
                                        {/* Auto-detect video vs image by extension if possible, or fallback to type. 
                                            Actually, let's rely on type or extension because type might be 'text' but have an image attached. */}
                                        {mediaUrl.match(/\.(mp4|webm|mov)$/i) || type === 'video' ? (
                                            <video src={mediaUrl} controls className="w-full max-h-64 object-cover" />
                                        ) : (
                                            <img
                                                src={mediaUrl}
                                                alt={title}
                                                className="w-full max-h-64 object-cover grayscale hover:grayscale-0 transition-all duration-700 animate-in fade-in zoom-in duration-1000"
                                            />
                                        )}
                                    </div>
                                )}

                                {type === 'audio' && !mediaUrl?.match(/\.(mp4|webm|mov|jpg|jpeg|png|webp|gif)$/i) && (
                                    <div className="mb-4 p-3 bg-current/5 rounded border border-current/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[10px] uppercase font-bold opacity-60">Audio Log</span>
                                        </div>
                                        {mediaUrl && <audio src={mediaUrl} controls className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity" />}
                                    </div>
                                )}
                            </motion.div>

                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={contentVariants}
                            >
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: MotionParagraph,
                                        h1: MotionH1,
                                        h2: MotionH2,
                                        h3: MotionH3,
                                        li: MotionLi,
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </motion.div>
                        </div>

                        {/* Domain Signature Footer */}
                        <div className="p-4 pt-2 flex justify-center opacity-40 border-t border-current/5 mt-auto">
                            {domain === 'study' ? (
                                <div className="flex flex-col items-center gap-1" title="Eleanor's Journal">
                                    <PencilSquareIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-script">E.V.</span>
                                </div>
                            ) : domain === 'boathouse' ? (
                                <div className="flex flex-col items-center gap-1" title="Julian's Log">
                                    <MapIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-mono tracking-widest">J.W.</span>
                                </div>
                            ) : domain === 'workshop' ? (
                                <div className="flex flex-col items-center gap-1" title="Cassie's Drafts">
                                    <Cog6ToothIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-handwriting -rotate-3">C.L.</span>
                                </div>
                            ) : (
                                <div className="w-8 h-1 bg-current rounded-full opacity-20" />
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
