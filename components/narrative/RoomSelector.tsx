"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

interface RoomZone {
    id: string;
    label: string;
    path: string;
    className: string; // Tailwind positioning classes
}

const rooms: RoomZone[] = [
    { id: "workshop", label: "The Workshop", path: "/workshop", className: "top-[32%] left-[12%] w-[15%] h-[20%]" },
    { id: "lounge", label: "The Hearth", path: "/lounge", className: "top-[42%] left-[42%] w-[18%] h-[25%]" },
    { id: "study", label: "The Study", path: "/study", className: "top-[15%] left-[58%] w-[12%] h-[15%]" },
    { id: "kitchen", label: "The Galley", path: "/kitchen", className: "top-[22%] left-[72%] w-[10%] h-[15%]" },
    { id: "boathouse", label: "The Boathouse", path: "/boathouse", className: "top-[32%] left-[85%] w-[12%] h-[20%]" },
    { id: "luminous-deep", label: "Control Room", path: "/luminous-deep", className: "top-[75%] left-[42%] w-[15%] h-[15%]" }
];

interface RoomSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RoomSelector({ isOpen, onClose }: RoomSelectorProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[70]"
                    >
                        <X size={32} strokeWidth={1} />
                    </button>

                    {/* Map Container - Paper Unfold Effect */}
                    <motion.div
                        initial={{ scaleY: 0.8, opacity: 0, filter: "blur(10px)" }}
                        animate={{ scaleY: 1, opacity: 1, filter: "blur(0px)" }}
                        exit={{ scaleY: 0.9, opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Elegant ease
                        className="relative w-[95vw] md:w-[85vw] max-w-6xl aspect-[16/9] select-none"
                    >
                        {/* Floorplan Image */}
                        <div
                            className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                            style={{
                                backgroundImage: "url('https://res.cloudinary.com/dptqxjhb8/image/upload/v1766417877/sanctuary_map_phqqnv.png')",
                                filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.5))"
                            }}
                        />

                        {/* Room Zones */}
                        {rooms.map((room) => (
                            <Link
                                key={room.id}
                                href={room.path}
                                onClick={onClose}
                                className={`absolute group cursor-pointer ${room.className}`}
                            >
                                {/* Hit Area Hover Highlight */}
                                <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors duration-500 rounded-lg blur-sm" />

                                {/* Floating Label */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 text-center pointer-events-none whitespace-nowrap z-20">
                                    <span className="font-serif text-amber-100 text-lg tracking-wide drop-shadow-md bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        {room.label}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
