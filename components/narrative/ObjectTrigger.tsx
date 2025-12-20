"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { Domain } from "@/lib/types";

interface ObjectTriggerProps {
    x: number;
    y: number;
    label: string;
    domain?: Domain;
    onClick: () => void;
}

export default function ObjectTrigger({ x, y, label, domain = "workshop", onClick }: ObjectTriggerProps) {
    return (
        <button
            onClick={onClick}
            className="absolute pointer-events-auto group focus:outline-none"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={label}
        >
            <div className="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2">

                {/* Pulse Effect */}
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className={clsx(
                        "absolute inset-0 rounded-full",
                        domain === "study" && "bg-amber-100",
                        domain === "workshop" && "bg-orange-400",
                        domain === "boathouse" && "bg-sky-400"
                    )}
                />

                {/* Core Marker */}
                <div
                    className={clsx(
                        "w-4 h-4 rounded-full border-2 transition-transform duration-300 group-hover:scale-110",
                        domain === "study" && "bg-study-ink border-study-paper",
                        domain === "workshop" && "bg-workshop-accent border-white",
                        domain === "boathouse" && "bg-boat-bg border-boat-line"
                    )}
                />

                {/* Tooltip Label */}
                <span className={clsx(
                    "absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-2 py-1 text-xs rounded shadow-lg",
                    "bg-white/90 backdrop-blur text-driftwood font-medium"
                )}>
                    {label}
                </span>
            </div>
        </button>
    );
}
