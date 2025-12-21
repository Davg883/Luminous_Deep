"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Navigation tabs for the global dock
 * Order: Home (Seagrove) → Lounge (Hearth) → Kitchen (Galley) → Study (Eleanor) → Workshop (Cassie) → Boathouse (Julian)
 */
const tabs = [
    { id: "home", label: "Home", path: "/" },
    { id: "lounge", label: "Lounge", path: "/lounge" },
    { id: "kitchen", label: "Kitchen", path: "/kitchen" },
    { id: "study", label: "Study", path: "/study" },
    { id: "workshop", label: "Workshop", path: "/workshop" },
    { id: "boathouse", label: "Boathouse", path: "/boathouse" },
];

export default function TheDock() {
    const pathname = usePathname();

    // Hide dock on home page - cinematic hero nav replaces it
    if (pathname === '/') {
        return null;
    }

    return (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto max-w-[95vw]">
            {/* Outer container with glass effect */}
            <div
                className={clsx(
                    "flex items-center gap-1 p-1",
                    "bg-sand/80 backdrop-blur-md",
                    "border border-driftwood/10 rounded-full shadow-lg",
                    // Mobile: horizontal scroll with hidden scrollbar
                    "overflow-x-auto scrollbar-hide",
                    // Prevent content from shrinking
                    "min-w-0"
                )}
            >
                {/* Inner flex container for tabs */}
                <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.path;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.path}
                                className={clsx(
                                    "relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium",
                                    "transition-colors duration-200",
                                    "whitespace-nowrap flex-shrink-0",
                                    "hover:text-sea",
                                    isActive ? "text-sea" : "text-driftwood/60"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-white shadow-sm rounded-full -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
