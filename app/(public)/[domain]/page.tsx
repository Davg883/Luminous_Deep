"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import SceneStage from "@/components/narrative/SceneStage";
import ObjectTrigger from "@/components/narrative/ObjectTrigger";
import RevealCard from "@/components/narrative/RevealCard";
import Atmosphere from "@/components/layout/Atmosphere";
import TheDock from "@/components/layout/TheDock";
import type { Domain } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export default function DomainPage() {
    const params = useParams();
    // Safe cast params.domain to our Domain type (in real app validate this)
    const domain = (params.domain as string);

    // Strict Domain Validation
    const validDomains = ["workshop", "study", "boathouse", "home", "lounge", "kitchen"];
    if (!validDomains.includes(domain)) {
        // If we are mistakenly catching 'studio' or other routes, let's explicit fail
        return <div className="p-10 text-red-500">Invalid Domain: {domain}</div>;
    }

    // Fetch scene by slug == domain (for MVP)
    const validatedDomain = domain as Domain;
    const scene = useQuery(api.public.scenes.getScene, { slug: validatedDomain });
    const objects = useQuery(api.public.scenes.getSceneObjects,
        scene ? { sceneId: scene._id } : "skip"
    );

    // Interactive State
    const [activeRevealId, setActiveRevealId] = useState<Id<"reveals"> | null>(null);

    // Helper to fetch the active reveal details (could be optimized)
    const activeReveal = useQuery(api.public.scenes.getReveal,
        activeRevealId ? { revealId: activeRevealId } : "skip"
    );

    if (!scene) {
        return (
            <div className="flex items-center justify-center h-screen bg-sand text-driftwood">
                <div className="animate-pulse">Locating {domain}...</div>
            </div>
        );
    }

    return (
        <>
            {/* Background Atmosphere */}
            <Atmosphere domain={validatedDomain} />

            {/* Main Stage */}
            <SceneStage
                mediaUrl={scene.backgroundMediaUrl}
                isFocused={!!activeRevealId}
                playbackSpeed={scene.playbackSpeed}
            >
                {objects?.map((obj) => (
                    <ObjectTrigger
                        key={obj._id}
                        x={obj.x}
                        y={obj.y}
                        label={obj.name}
                        domain={validatedDomain}
                        onClick={() => setActiveRevealId(obj.revealId)}
                    />
                ))}
            </SceneStage>

            {/* Navigation */}
            <TheDock />

            {/* Interaction Modal */}
            <RevealCard
                isOpen={!!activeRevealId && !!activeReveal}
                onClose={() => setActiveRevealId(null)}
                title={activeReveal?.title || "Loading..."}
                content={activeReveal?.content || ""}
                type={activeReveal?.type || "text"}
                mediaUrl={activeReveal?.mediaUrl}
                domain={validatedDomain}
            />
        </>
    );
}
