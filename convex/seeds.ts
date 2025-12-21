import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to seed a scene
async function upsertSceneFull(ctx: any, slug: string, title: string, domain: string, bgUrl: string, objects: any[], tags?: string[], playbackSpeed?: number) {
    // 1. Scene
    let scene = await ctx.db
        .query("scenes")
        .withIndex("by_slug", (q: any) => q.eq("slug", slug))
        .first();

    let sceneId;
    if (scene) {
        sceneId = scene._id;
        await ctx.db.patch(sceneId, {
            backgroundMediaUrl: bgUrl || scene.backgroundMediaUrl,
            domain: domain as any,
            tags: tags || scene.tags,
            playbackSpeed: playbackSpeed
        });
    } else {
        sceneId = await ctx.db.insert("scenes", {
            slug,
            title,
            domain: domain as any,
            backgroundMediaUrl: bgUrl || "",
            isPublished: true,
            tags: tags || [],
            playbackSpeed: playbackSpeed
        });
    }

    // 2. Objects & Reveals
    // For this build, we'll clear and re-add if objects exist to ensure canonical sync
    const existingObjs = await ctx.db.query("objects").withIndex("by_scene", (q: any) => q.eq("sceneId", sceneId)).collect();
    for (const obj of existingObjs) {
        await ctx.db.delete(obj._id);
    }

    for (const obj of objects) {
        const revealId = await ctx.db.insert("reveals", {
            type: (obj.revealType || "text") as any,
            title: obj.revealTitle,
            content: obj.revealContent,
            voice: obj.voice as any,
            tags: obj.revealTags || [],
            status: "published",
            publishedAt: Date.now(),
        });

        await ctx.db.insert("objects", {
            sceneId,
            name: obj.name,
            x: obj.x,
            y: obj.y,
            hint: obj.hint || `View ${obj.name}`,
            revealId,
            role: obj.role || "trigger"
        });
    }
}


export const seedWorkshop = mutation({
    args: {},
    handler: async (ctx) => {
        await upsertSceneFull(
            ctx,
            "workshop",
            "The Workbench",
            "workshop",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235190/Cassie_zone_l78a2t.png",
            [
                {
                    name: "Sketchpad",
                    x: 50, y: 50,
                    hint: "View sketches",
                    revealType: "text", revealTitle: "Initial Ideas", revealContent: "A rough charcoal sketch of the coastal elevation..."
                },
                {
                    name: "Lantern",
                    x: 20, y: 80,
                    hint: "Inspect lantern",
                    revealType: "text", revealTitle: "Lantern Study", revealContent: "Study #4 for the exterior lighting..."
                }
            ]
        );
        return "Seeded Workshop";
    },
});

export const seedAll = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Home (Arrival)
        await upsertSceneFull(
            ctx,
            "home",
            "Seagrove Bay",
            "home",
            "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235198/House_video_z7n1yj.mp4",
            [
                {
                    name: "The Arrival",
                    x: 50, y: 70,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Welcome to Luminous Deep",
                    revealContent: "You stand on the edge of the water. Seagrove Bay is still, its surface a mirror for the fading light. Ahead, the house sits perched on the rocks. This is not just a building; it is a repository of things lost and found. Approach the door.",
                    hint: "Begin your journey",
                    voice: "neutral",
                    revealTags: ["intro", "arrival"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["intro"]
        );

        // 2. Study (Eleanor)
        await upsertSceneFull(
            ctx,
            "study",
            "The Study",
            "study",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235184/Eleanor_Zone_k94m5g.png",
            [
                {
                    name: "Leather Journal",
                    x: 45, y: 60,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "October 14th",
                    revealContent: "The fog has finally lifted from the bay. I spent the morning pressing a wild orchid I found by the boathouse. Julian says the weather is changing, but I find comfort in the shift. If you are reading this, you are the first guest we've had in a long while.",
                    hint: "Read Eleanor's entry",
                    voice: "eleanor",
                    revealTags: ["journal", "canon"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["reflection"]
        );

        // 3. Workshop (Cassie)
        await upsertSceneFull(
            ctx,
            "workshop",
            "The Workshop",
            "workshop",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235190/Cassie_zone_l78a2t.png",
            [
                {
                    name: "Schematic Blueprint",
                    x: 55, y: 45,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Hull Design v3",
                    revealContent: "Okay, so the curvature is still wrong. If we want it to cut through the chop, we need a sharper entry angle! I've gone through three erasers already. Julian thinks I'm overthinking it, but he doesn't have to weld the seams.",
                    hint: "Inspect sketch",
                    voice: "cassie",
                    revealTags: ["blueprint", "canon"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["creation"]
        );

        // 4. Boathouse (Julian)
        await upsertSceneFull(
            ctx,
            "boathouse",
            "The Boathouse",
            "boathouse",
            "", // Placeholder, will rely on sync or fallback
            [
                {
                    name: "Tide Chart",
                    x: 60, y: 40,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Julian's Log #1",
                    revealContent: "The tides are shifting. Highest crest in five years expected tonight. The timbers are groaning properly now—this old place likes the strain. If the sea wants in, it'll have to knock harder than that.",
                    hint: "Check tide chart",
                    voice: "julian",
                    revealTags: ["log", "canon"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["nature"]
        );

        // 5. Lounge (Hearth)
        await upsertSceneFull(
            ctx,
            "lounge",
            "The Hearth",
            "lounge",
            "",
            [
                {
                    name: "Embers",
                    x: 50, y: 50,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Fading Warmth",
                    revealContent: "The fire has died down to a dull glow. The silence here is heavy, weighted by the years of conversations that no longer happen.",
                    hint: "Stare into the fire",
                    voice: "hearth",
                    revealTags: ["mood", "canon"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["warmth"],
            0.5 // playbackSpeed
        );

        // 6. Kitchen (Utility)
        await upsertSceneFull(
            ctx,
            "kitchen",
            "The Galley",
            "kitchen",
            "",
            [
                {
                    name: "Kettle",
                    x: 40, y: 60,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Morning Ritual",
                    revealContent: "The kettle whistles, a sharp piercing sound that cuts through the morning fog. It's the only reliable thing in this house.",
                    hint: "Check the kettle",
                    voice: "systems",
                    revealTags: ["routine", "canon"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["utility"]
        );

        return "Initial Canon Seeded via seedAll (Home, Study, Workshop, Boathouse, Lounge, Kitchen)";
    }
});

export const seedInitialCanon = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Home (Arrival)
        await upsertSceneFull(
            ctx,
            "home",
            "Seagrove Bay",
            "home",
            "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235198/House_video_z7n1yj.mp4",
            [
                {
                    name: "The Arrival",
                    x: 50, y: 70,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Welcome to Luminous Deep",
                    revealContent: "You stand on the edge of the water. Seagrove Bay is still, its surface a mirror for the fading light. Ahead, the house sits perched on the rocks. This is not just a building; it is a repository of things lost and found. Approach the door.",
                    hint: "Begin your journey",
                    voice: "neutral",
                    revealTags: ["intro", "arrival"]
                }
            ],
            ["intro"]
        );

        // 2. Study (Eleanor)
        await upsertSceneFull(
            ctx,
            "study",
            "The Study",
            "study",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235184/Eleanor_Zone_k94m5g.png",
            [
                {
                    name: "Leather Journal",
                    x: 45, y: 60,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "October 14th",
                    revealContent: "The fog has finally lifted from the bay. I spent the morning pressing a wild orchid I found by the boathouse. Julian says the weather is changing, but I find comfort in the shift. If you are reading this, you are the first guest we've had in a long while.",
                    hint: "Read Eleanor's entry",
                    voice: "eleanor",
                    revealTags: ["journal", "canon"]
                }
            ],
            ["reflection"]
        );

        // 3. Workshop (Cassie)
        await upsertSceneFull(
            ctx,
            "workshop",
            "The Workshop",
            "workshop",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235190/Cassie_zone_l78a2t.png",
            [
                {
                    name: "Schematic Blueprint",
                    x: 55, y: 45,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Hull Design v3",
                    revealContent: "Okay, so the curvature is still wrong. If we want it to cut through the chop, we need a sharper entry angle! I've gone through three erasers already. Julian thinks I'm overthinking it, but he doesn't have to weld the seams.",
                    hint: "Inspect sketch",
                    voice: "cassie",
                    revealTags: ["blueprint", "canon"]
                }
            ],
            ["creation"]
        );

        return "Initial Canon Seeded (Home, Study, Workshop)";
    }
});

