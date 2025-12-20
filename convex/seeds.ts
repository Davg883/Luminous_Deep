import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to seed a scene
async function upsertSceneFull(ctx: any, slug: string, title: string, domain: string, bgUrl: string, objects: any[]) {
    // 1. Scene
    let scene = await ctx.db
        .query("scenes")
        .withIndex("by_slug", (q: any) => q.eq("slug", slug))
        .first();

    let sceneId;
    if (scene) {
        sceneId = scene._id;
        if (bgUrl) {
            await ctx.db.patch(sceneId, { backgroundMediaUrl: bgUrl });
        }
    } else {
        sceneId = await ctx.db.insert("scenes", {
            slug,
            title,
            domain: domain as "workshop" | "study" | "boathouse" | "home",
            backgroundMediaUrl: bgUrl || "",
            isPublished: true,
        });
    }

    // 2. Objects & Reveals
    // Check if objects exist to avoid dupes on re-run
    const existingObjs = await ctx.db.query("objects").withIndex("by_scene", (q: any) => q.eq("sceneId", sceneId)).collect();

    if (existingObjs.length === 0) {
        for (const obj of objects) {
            const revealId = await ctx.db.insert("reveals", {
                type: (obj.revealType || "text") as "text" | "audio" | "video" | "image",
                title: obj.revealTitle,
                content: obj.revealContent,
            });

            await ctx.db.insert("objects", {
                sceneId,
                name: obj.name,
                x: obj.x,
                y: obj.y,
                hint: obj.hint || `View ${obj.name}`,
                revealId,
            });
        }
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
        // 1. Home (Video)
        await upsertSceneFull(
            ctx,
            "home",
            "The Home",
            "workshop", // Use workshop domain styling for home
            "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235198/House_video_z7n1yj.mp4",
            []
        );

        // 2. Study
        await upsertSceneFull(
            ctx,
            "study",
            "The Study",
            "study",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235184/Eleanor_Zone_k94m5g.png",
            [
                {
                    name: "The Journal",
                    x: 50, y: 60,
                    hint: "Read entry",
                    revealType: "text", revealTitle: "Journal Entry", revealContent: "Eleanor's entry: The tides are changing..."
                },
                {
                    name: "The Window",
                    x: 80, y: 30,
                    hint: "Look out",
                    revealType: "text", revealTitle: "Note", revealContent: "Moonlight Reflection."
                }
            ]
        );

        // 3. Boathouse
        await upsertSceneFull(
            ctx,
            "boathouse",
            "The Boathouse",
            "boathouse",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235193/Julian_zone_fdbchs.png",
            [
                {
                    name: "Blueprints",
                    x: 40, y: 70,
                    hint: "Inspect",
                    revealType: "text", revealTitle: "Schematic", revealContent: "Structural schematic of the lower deck."
                },
                {
                    name: "Hanging Lantern",
                    x: 20, y: 20,
                    hint: "Inspect",
                    revealType: "text", revealTitle: "Artifact", revealContent: "Restored 1920s storm lantern."
                }
            ]
        );

        return "Seeded All (Repaired)";
    }
});
