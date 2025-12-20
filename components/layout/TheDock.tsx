"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

const tabs = [
    { id: "home", label: "Home", path: "/" },
    { id: "workshop", label: "Workshop", path: "/workshop" },
    { id: "study", label: "Study", path: "/study" },
    { id: "boathouse", label: "Boathouse", path: "/boathouse" },
];

export default function TheDock() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-1 p-1 bg-sand/80 backdrop-blur-md border border-driftwood/10 rounded-full shadow-lg">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path;
                    return (
                        <Link
                            key={tab.id}
                            href={tab.path}
                            className={clsx(
                                "relative px-4 py-2 text-sm font-medium transition-colors hover:text-sea",
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
    );
}
