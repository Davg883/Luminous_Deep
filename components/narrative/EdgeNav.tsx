"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Circular Order: Home <-> Workshop <-> Lounge <-> Study <-> Kitchen <-> Boathouse <-> Home
const SEQUENCE = ["home", "workshop", "lounge", "study", "kitchen", "boathouse"];

const LABELS: Record<string, string> = {
    home: "THE ARRIVAL",
    workshop: "THE WORKBENCH",
    lounge: "THE HEARTH",
    study: "THE STUDY",
    kitchen: "THE GALLEY",
    boathouse: "THE ANCHORAGE",
    "luminous-deep": "THE DEEP"
};

export default function EdgeNav({ currentSlug }: { currentSlug: string }) {
    const router = useRouter();
    // Normalize slug logic
    const normalizedSlug = currentSlug === "" || !currentSlug ? "home" : currentSlug;

    // Special handling for Deep (Sub-level)
    if (normalizedSlug === "luminous-deep") {
        return (
            <div
                className="fixed top-0 left-0 bottom-0 w-24 z-40 flex items-center justify-start group cursor-pointer pl-6"
                onClick={() => router.push("/boathouse")}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/0 to-transparent group-hover:from-black/10 transition-all duration-700 pointer-events-none" />
                <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out flex flex-col items-center gap-2 relative z-10 text-driftwood/60 group-hover:text-sea dark:text-white/40 dark:group-hover:text-white">
                    <ChevronLeft className="w-6 h-6" />
                    <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase [writing-mode:vertical-rl] rotate-180">
                        ASCEND TO ANCHORAGE
                    </span>
                </div>
            </div>
        );
    }

    const currentIndex = SEQUENCE.indexOf(normalizedSlug);

    // If not in sequence (e.g. unknown), disable
    if (currentIndex === -1) return null;

    // Circular Logic
    const prevIndex = (currentIndex - 1 + SEQUENCE.length) % SEQUENCE.length;
    const nextIndex = (currentIndex + 1) % SEQUENCE.length;

    const prevSlug = SEQUENCE[prevIndex];
    const nextSlug = SEQUENCE[nextIndex];

    return (
        <>
            {/* Left Edge (Previous) */}
            <div
                className="fixed top-0 left-0 bottom-0 w-[5vw] z-40 flex items-center justify-start group cursor-pointer pl-6"
                onClick={() => router.push(`/${prevSlug === 'home' ? '' : prevSlug}`)}
            >
                {/* Sea Mist Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-teal-900/0 via-teal-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-in-out pointer-events-none" />

                {/* Content */}
                <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out flex flex-col items-center gap-2 relative z-10 text-driftwood/60 group-hover:text-sea dark:text-white/40 dark:group-hover:text-white">
                    <ChevronLeft className="w-6 h-6" />
                    <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
                        To {LABELS[prevSlug]}
                    </span>
                </div>
            </div>

            {/* Right Edge (Next) */}
            <div
                className="fixed top-0 right-0 bottom-0 w-[5vw] z-40 flex items-center justify-end group cursor-pointer pr-6"
                onClick={() => router.push(`/${nextSlug === 'home' ? '' : nextSlug}`)}
            >
                {/* Sea Mist Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-l from-teal-900/0 via-teal-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-in-out pointer-events-none" />

                {/* Content */}
                <div className="opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out flex flex-col items-center gap-2 relative z-10 text-driftwood/60 group-hover:text-sea dark:text-white/40 dark:group-hover:text-white">
                    <ChevronRight className="w-6 h-6" />
                    <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase [writing-mode:vertical-rl] whitespace-nowrap">
                        To {LABELS[nextSlug]}
                    </span>
                </div>
            </div>
        </>
    );
}
