"use client";

import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { RevealType, Domain } from "@/lib/types";

interface RevealCardProps {
    title: string;
    content: string;
    type: RevealType;
    domain?: Domain;
    isOpen: boolean;
    onClose: () => void;
    mediaUrl?: string;
}

export default function RevealCard({
    title,
    content,
    type,
    domain = "workshop",
    isOpen,
    onClose,
    mediaUrl
}: RevealCardProps) {

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={clsx(
                            "fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 p-6 rounded-2xl shadow-2xl",
                            domain === "study" && "bg-study-bg/95 text-study-paper font-serif border border-study-paper/20",
                            domain === "workshop" && "bg-sand/95 text-driftwood font-sans border border-orange-200",
                            domain === "boathouse" && "bg-boat-bg/95 text-boat-line font-mono border border-boat-line/30"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">{title}</h3>
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="prose prose-sm max-w-none">
                            {/* Media Handler */}
                            {type === 'image' && mediaUrl && (
                                <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
                                    <img src={mediaUrl} alt={title} className="w-full h-auto" />
                                </div>
                            )}

                            {type === 'video' && mediaUrl && (
                                <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
                                    <video src={mediaUrl} controls className="w-full h-auto" />
                                </div>
                            )}

                            {type === 'audio' && (
                                <div className="mb-4 p-4 bg-black/5 rounded-lg border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-sea flex items-center justify-center text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 0 1 .298 1.06 10.502 10.502 0 0 1-5.463 9.226c-1.12.554-1.57 1.7-1.57 2.506 0 1.255-1.096 2.358-2.58 2.586C8.809 17.315 7.5 18.809 7.5 20.25a.75.75 0 0 1-1.5 0c0-2.281 2.056-4.382 4.418-4.75 1.144-.178 1.582-.904 1.582-1.5 0-.256-.055-.658.077-1.298C12.87 11.233 13.967 8 16.5 8c.556 0 1.004-.448 1.004-1.006A7.502 7.502 0 0 0 11.45.08a.75.75 0 0 1 .537-1.4 9.002 9.002 0 0 1 7.965 2.97Z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="text-xs font-bold uppercase opacity-50 tracking-wider">Audio Record</div>
                                    </div>
                                    {mediaUrl && <audio src={mediaUrl} controls className="w-full mt-3 h-8" />}
                                </div>
                            )}

                            <p className={clsx(
                                "leading-relaxed whitespace-pre-wrap",
                                domain === "study" && "text-study-paper/80",
                                domain === "workshop" && "text-driftwood/80",
                                domain === "boathouse" && "text-boat-line/80"
                            )}>
                                {content}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
