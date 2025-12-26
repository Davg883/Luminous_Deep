"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

interface RoomZone {
    id: string;
    label: string;
    path: string;
    points: string; // SVG Polygon points (percentages on 0-100 viewBox)
}

// Precision Coordinates (Isometric Floor Alignment)
const rooms: RoomZone[] = [
    { id: "workshop", label: "The Workshop", path: "/workshop", points: "8,35 24,32 28,52 10,58" },
    { id: "lounge", label: "The Hearth", path: "/lounge", points: "32,45 55,42 62,68 38,72" },
    { id: "study", label: "The Study", path: "/study", points: "52,18 64,16 68,32 55,34" },
    { id: "kitchen", label: "The Galley", path: "/kitchen", points: "66,22 78,20 82,38 69,42" },
    { id: "boathouse", label: "The Boathouse", path: "/boathouse", points: "82,34 94,32 96,55 84,58" },
    { id: "luminous-deep", label: "Control Room", path: "/luminous-deep", points: "30,75 55,73 58,92 32,95" },
    { id: "orangery", label: "The Orangery", path: "/orangery", points: "0,0" },
    { id: "sanctuary", label: "The Sanctuary", path: "/sanctuary", points: "0,0" }
];

interface RoomSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper to calculate centroid for label positioning
function getCentroid(points: string) {
    const pairs = points.split(" ");
    let xTotal = 0, yTotal = 0;
    pairs.forEach(p => {
        const [x, y] = p.split(",").map(Number);
        xTotal += x;
        yTotal += y;
    });
    return { x: xTotal / pairs.length, y: yTotal / pairs.length };
}

// @ts-ignore
const drawVariant = {
    rest: { pathLength: 0, opacity: 0 },
    hover: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 0.8, ease: "easeInOut" },
            opacity: { duration: 0.2 }
        }
    }
};

export default function RoomSelector({ isOpen, onClose }: RoomSelectorProps) {
    const router = useRouter();
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

    const handleNavigate = (path: string) => {
        onClose();
        router.push(path);
    };

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
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-[95vw] md:w-[85vw] max-w-6xl aspect-[16/9] select-none shadow-2xl bg-[#0a0a0a]"
                    >
                        {/* Floorplan Image */}
                        <div
                            className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
                            style={{
                                backgroundImage: "url('https://res.cloudinary.com/dptqxjhb8/image/upload/v1766749484/floorplan_VS2_usmdzb.png')",
                                filter: "sepia(0.2) contrast(1.1) drop-shadow(0 20px 50px rgba(0,0,0,0.5))"
                            }}
                        />

                        {/* Interactive SVG Layer */}
                        <svg
                            className="absolute inset-0 w-full h-full z-10"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <filter id="rough-paper">
                                    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
                                </filter>
                            </defs>

                            {rooms.map((room) => (
                                <g key={room.id} onClick={() => handleNavigate(room.path)}>
                                    {/* Hit Zone (Transparent but active) */}
                                    <motion.polygon
                                        points={room.points}
                                        fill="transparent"
                                        stroke="transparent"
                                        className="cursor-pointer"
                                        onHoverStart={() => setHoveredRoom(room.id)}
                                        onHoverEnd={() => setHoveredRoom(null)}
                                        whileHover={{ fillOpacity: 0.1 }}
                                    />

                                    {/* Visual Ink Stroke */}
                                    <motion.polygon
                                        points={room.points}
                                        fill="transparent"
                                        stroke="#3e5c76"
                                        strokeWidth="2px"
                                        vectorEffect="non-scaling-stroke"
                                        filter="url(#rough-paper)"
                                        variants={drawVariant as any}
                                        initial="rest"
                                        animate={hoveredRoom === room.id ? "hover" : "rest"}
                                        className="pointer-events-none"
                                    />

                                    {/* Hover Tint */}
                                    <motion.polygon
                                        points={room.points}
                                        fill="#3e5c76"
                                        stroke="none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: hoveredRoom === room.id ? 0.05 : 0 }}
                                        className="pointer-events-none"
                                    />
                                </g>
                            ))}
                        </svg>

                        {/* Labels & Embers Layer */}
                        {rooms.map((room, index) => {
                            const center = getCentroid(room.points);
                            const isHovered = hoveredRoom === room.id;

                            return (
                                <div
                                    key={room.id}
                                    className="absolute pointer-events-none z-20 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: `${center.x}%`, top: `${center.y}%` }}
                                >
                                    {/* The Ember (Moth to Flame) - Only visible when NOT hovered */}
                                    <div className={clsx(
                                        "w-[4px] h-[4px] bg-stone-800 rounded-full",
                                        "animate-pulse shadow-[0_0_12px_rgba(251,146,60,0.8)]",
                                        "transition-opacity duration-500",
                                        isHovered ? "opacity-0" : "opacity-100"
                                    )} />

                                    {/* Diegetic Label (Vellum Tape) - Pops on open, jumps on hover */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, rotate: -2 }}
                                        animate={{
                                            opacity: 1,
                                            y: isHovered ? -40 : -25,
                                            rotate: isHovered ? 0 : -1,
                                            scale: isHovered ? 1.1 : 1
                                        }}
                                        transition={{
                                            opacity: { delay: 0.6 + (index * 0.1), duration: 0.5 },
                                            y: { type: "spring", stiffness: 300, damping: 20 },
                                            scale: { duration: 0.2 }
                                        }}
                                        className={clsx(
                                            "absolute px-3 py-1",
                                            "bg-[#f5e6d3]/95 backdrop-blur-sm",
                                            "border border-[#d4c5a5]/60 shadow-md",
                                            "font-serif text-[#1a2e40] text-xs md:text-sm lg:text-base whitespace-nowrap tracking-wide",
                                            "uppercase"
                                        )}
                                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                                    >
                                        {room.label}
                                    </motion.div>
                                </div>
                            );
                        })}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
