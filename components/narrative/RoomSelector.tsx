"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, ChevronDown } from "lucide-react";

interface RoomNode {
    id: string;
    label: string;
    path: string;
    top: string;
    left: string;
    align: "left" | "right" | "center";
}

const mapNodes: RoomNode[] = [
    { id: "study", label: "The Study", path: "/study", top: "25%", left: "25%", align: "right" },
    { id: "boathouse", label: "Boathouse", path: "/boathouse", top: "20%", left: "75%", align: "left" },
    { id: "lounge", label: "The Hearth", path: "/lounge", top: "45%", left: "40%", align: "center" },
    { id: "workshop", label: "Workshop", path: "/workshop", top: "40%", left: "15%", align: "right" },
    { id: "kitchen", label: "Kitchen", path: "/kitchen", top: "60%", left: "70%", align: "left" },
    { id: "home", label: "Arrival", path: "/home", top: "85%", left: "50%", align: "center" },
];

interface RoomSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RoomSelector({ isOpen, onClose }: RoomSelectorProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
                >
                    {/* Dark Backdrop */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-50"
                    >
                        <X size={32} strokeWidth={1} />
                    </button>

                    {/* Map Container */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="relative w-full max-w-4xl aspect-[4/3] md:aspect-video select-none"
                    >
                        {/* Floorplan Image (Placeholder) */}
                        <div
                            className="absolute inset-0 bg-[url('/assets/floorplan_placeholder.webp')] bg-contain bg-center bg-no-repeat opacity-20"
                            style={{ filter: "invert(1) drop-shadow(0 0 20px rgba(255,255,255,0.2))" }}
                        />

                        {/* Room Nodes */}
                        {mapNodes.map((node, i) => (
                            <Link
                                key={node.id}
                                href={node.path}
                                onClick={onClose}
                                className="absolute group"
                                style={{
                                    top: node.top,
                                    left: node.left,
                                    transform: "translate(-50%, -50%)"
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className={`flex flex-col ${node.align === 'left' ? 'items-start' : node.align === 'right' ? 'items-end' : 'items-center'}`}
                                >
                                    {/* Dot Marker */}
                                    <div className="w-2 h-2 rounded-full bg-white mb-2 group-hover:scale-150 group-hover:bg-amber-400 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />

                                    {/* Label */}
                                    <span className="font-serif text-lg md:text-2xl text-white/60 group-hover:text-white transition-colors duration-300 whitespace-nowrap">
                                        {node.label}
                                    </span>
                                </motion.div>
                            </Link>
                        ))}

                        {/* Deep Descent Link */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full text-center">
                            <Link
                                href="/luminous-deep"
                                onClick={onClose}
                                className="group inline-flex flex-col items-center gap-2 text-sky-500/50 hover:text-sky-400 transition-colors duration-500"
                            >
                                <span className="font-sans text-[10px] tracking-[0.3em] uppercase opacity-70 group-hover:opacity-100">
                                    Below the Foundation
                                </span>
                                <ChevronDown className="w-4 h-4 animate-bounce opacity-50 group-hover:opacity-100" />
                            </Link>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
