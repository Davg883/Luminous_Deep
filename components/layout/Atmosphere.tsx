"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { Domain } from "@/lib/types";

interface AtmosphereProps {
    domain: Domain;
}

export default function Atmosphere({ domain }: AtmosphereProps) {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {domain === "study" && <StudyAtmosphere />}
            {domain === "workshop" && <WorkshopAtmosphere />}
            {domain === "boathouse" && <BoathouseAtmosphere />}
            {domain === "home" && <WorkshopAtmosphere />} {/* Fallback to workshop for home */}
        </div>
    );
}

function StudyAtmosphere() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-study-bg"
        >
            {/* Deep breathing gradient */}
            <motion.div
                animate={{ opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,transparent_100%)]"
            />
        </motion.div>
    );
}

function WorkshopAtmosphere() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-workshop-bg"
        >
            {/* Noise Texture */}
            <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* Projector Light Orb */}
            <motion.div
                animate={{
                    x: ["-10%", "10%", "-10%"],
                    y: ["-5%", "5%", "-5%"],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-workshop-accent/10 rounded-full blur-[100px]"
            />
        </motion.div>
    );
}

function BoathouseAtmosphere() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-boat-bg text-boat-line"
        >
            {/* Architectural Grid */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Subtle Blueprint Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0c0a09_90%)]" />
        </motion.div>
    );
}
