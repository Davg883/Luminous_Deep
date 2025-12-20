"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SceneStage from "@/components/narrative/SceneStage";
import Atmosphere from "@/components/layout/Atmosphere";
import TheDock from "@/components/layout/TheDock";

export default function Home() {
    const scene = useQuery(api.public.scenes.getScene, { slug: "home" });

    if (!scene) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-sand">
                <div className="w-8 h-8 border-2 border-driftwood/20 border-t-driftwood rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="relative w-full h-screen overflow-hidden">
            <Atmosphere domain="home" />

            <SceneStage mediaUrl={scene.backgroundMediaUrl}>
            </SceneStage>

            <TheDock />
        </main>
    );
}
