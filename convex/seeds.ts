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
        let revealId;

        // Only create a reveal if it's NOT a pure transition/portal
        if (obj.role !== "transition") {
            revealId = await ctx.db.insert("reveals", {
                type: (obj.revealType || "text") as any,
                title: obj.revealTitle || "Untitled",
                content: obj.revealContent || "",
                voice: obj.voice as any,
                tags: obj.revealTags || [],
                status: "published",
                publishedAt: Date.now(),
            });
        }

        await ctx.db.insert("objects", {
            sceneId,
            name: obj.name,
            x: obj.x,
            y: obj.y,
            hint: obj.hint || (obj.role === "transition" ? `Enter ${obj.name}` : `View ${obj.name}`),
            revealId,
            role: obj.role || "trigger",
            destinationSlug: obj.destinationSlug
        });
    }
}



export const wipeAll = mutation({
    args: {},
    handler: async (ctx) => {
        const tables = ["scenes", "objects", "reveals", "contentPacks", "contentPacksHistory", "media", "chapters"];
        for (const table of tables) {
            const docs = await ctx.db.query(table as any).collect();
            for (const doc of docs) {
                await ctx.db.delete(doc._id);
            }
        }
        return "Database Wiped";
    },
});

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
                },
                {
                    name: "The Front Door",
                    x: 65, y: 40,
                    role: "transition",
                    destinationSlug: "/workshop",
                    hint: "Enter Workshop"
                },
                // Portal to Workshop
                {
                    name: "The Front Door",
                    x: 65, y: 40,
                    role: "transition",
                    destinationSlug: "/workshop",
                    hint: "Enter Workshop"
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
                },
                {
                    name: "Side Door",
                    x: 80, y: 60,
                    role: "transition",
                    destinationSlug: "/kitchen",
                    hint: "Enter Kitchen"
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
                },
                {
                    name: "Hallway",
                    x: 20, y: 50,
                    role: "transition",
                    destinationSlug: "/lounge",
                    hint: "Enter Lounge"
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
                },
                {
                    name: "The Heavy Door",
                    x: 88, y: 50,
                    role: "transition",
                    destinationSlug: "/luminous-deep",
                    hint: "Descent"
                },
                {
                    name: "Path to Home",
                    x: 15, y: 60,
                    role: "transition",
                    destinationSlug: "/home",
                    hint: "Return to Home"
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
                },
                {
                    name: "Library Door",
                    x: 75, y: 45,
                    role: "transition",
                    destinationSlug: "/study",
                    hint: "Enter Study"
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
                },
                {
                    name: "Wharf Path",
                    x: 25, y: 70,
                    role: "transition",
                    destinationSlug: "/boathouse",
                    hint: "To Boathouse"
                }
            ],
            ["utility"]
        );

        // 7. Luminous Deep - The Control Room (Sub-Basement)
        await upsertSceneFull(
            ctx,
            "control-room",
            "The Control Room",
            "luminous-deep",
            "", // Placeholder for retro-tech background
            [
                {
                    name: "System Console",
                    x: 50, y: 50,
                    role: "system",
                    revealType: "text",
                    revealTitle: "SYSTEM STATUS",
                    revealContent: "```\n[LUMINOUS DEEP v0.1.0]\n----------------------\nAGENTS ONLINE: 3\nWORKFLOWS: IDLE\nARTEFACTS: 24\n----------------------\nAll systems nominal.\n```",
                    hint: "Access system console",
                    voice: "systems",
                    revealTags: ["system", "meta"],
                    status: "published",
                    publishedAt: Date.now(),
                }
            ],
            ["meta", "control"],
            undefined // playbackSpeed
        );

        // Seed the canonical agents
        const controlRoom = await ctx.db.query("scenes").withIndex("by_slug", (q: any) => q.eq("slug", "control-room")).first();
        const boathouse = await ctx.db.query("scenes").withIndex("by_slug", (q: any) => q.eq("slug", "boathouse")).first();
        const study = await ctx.db.query("scenes").withIndex("by_slug", (q: any) => q.eq("slug", "study")).first();
        const workshop = await ctx.db.query("scenes").withIndex("by_slug", (q: any) => q.eq("slug", "workshop")).first();

        // Check if agents already exist before inserting
        const existingJulian = await ctx.db.query("agents").withIndex("by_name", (q: any) => q.eq("name", "Julian")).first();
        if (!existingJulian && boathouse) {
            await ctx.db.insert("agents", {
                name: "Julian",
                homeSpaceId: boathouse._id,
                role: "Analyst",
                description: "The methodical weatherman. Reads tides, tracks patterns, provides grounded analysis.",
                capabilities: ["read_tides", "analyze_patterns", "forecast", "navigate"],
                tools: ["search", "analyze", "summarize"],
                autonomy: 3,
                voice: "julian",
                isActive: true,
                createdAt: Date.now(),
            });
        }

        const existingEleanor = await ctx.db.query("agents").withIndex("by_name", (q: any) => q.eq("name", "Eleanor")).first();
        if (!existingEleanor && study) {
            await ctx.db.insert("agents", {
                name: "Eleanor",
                homeSpaceId: study._id,
                role: "Curator",
                description: "The reflective archivist. Preserves memories, curates meaning, surfaces connections.",
                capabilities: ["archive", "curate", "reflect", "connect"],
                tools: ["search", "organize", "generate"],
                autonomy: 2,
                voice: "eleanor",
                isActive: true,
                createdAt: Date.now(),
            });
        }

        const existingCassie = await ctx.db.query("agents").withIndex("by_name", (q: any) => q.eq("name", "Cassie")).first();
        if (!existingCassie && workshop) {
            await ctx.db.insert("agents", {
                name: "Cassie",
                homeSpaceId: workshop._id,
                role: "Maker",
                description: "The energetic builder. Sketches ideas, iterates fast, embraces the draft.",
                capabilities: ["sketch", "prototype", "iterate", "build"],
                tools: ["generate", "edit", "transform"],
                autonomy: 4,
                voice: "cassie",
                isActive: true,
                createdAt: Date.now(),
            });
        }

        return "Initial Canon Seeded via seedAll (Home, Study, Workshop, Boathouse, Lounge, Kitchen, Control Room + Agents)";
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

        // 4. Control Room (Luminous Deep)
        await upsertSceneFull(
            ctx,
            "luminous-deep",
            "The Luminous Deep",
            "luminous-deep",
            "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235198/House_video_z7n1yj.mp4", // Placeholder - door entry video
            [], // No initial objects - this is the Agentic HUD space
            ["control", "system", "agents"],
            1.0
        );

        return "Initial Canon Seeded (Home, Study, Workshop, Control Room)";
    }
});

// ═══════════════════════════════════════════════════════════════
// CONTROL ROOM FIX - Quick mutation to ensure the scene exists
// ═══════════════════════════════════════════════════════════════
export const ensureControlRoomExists = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if scene already exists
        const existing = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", "luminous-deep"))
            .first();

        if (existing) {
            return { status: "exists", id: existing._id };
        }

        // Create the Control Room scene
        const sceneId = await ctx.db.insert("scenes", {
            slug: "luminous-deep",
            title: "The Luminous Deep",
            domain: "luminous-deep" as any,
            backgroundMediaUrl: "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235198/House_video_z7n1yj.mp4",
            isPublished: true,
            tags: ["control", "system", "agents"],
            tagline: "Where the engineers watch the machine dream.",
            mood: ["retro-futurist", "terminal", "analytical"],
            allowedTools: ["telemetry", "agent-management", "workflow-runner"],
        });

        return { status: "created", id: sceneId };
    }
});

// ═══════════════════════════════════════════════════════════════
// PORTAL TO CONTROL ROOM - Add the Heavy Door to Boathouse
// ═══════════════════════════════════════════════════════════════
export const addPortalToBoathouse = mutation({
    args: {},
    handler: async (ctx) => {
        // Find the Boathouse scene
        const boathouse = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", "boathouse"))
            .first();

        if (!boathouse) {
            return { status: "error", message: "Boathouse scene not found. Run seedAll first." };
        }

        // Check if portal already exists
        const existingObjects = await ctx.db
            .query("objects")
            .withIndex("by_scene", (q: any) => q.eq("sceneId", boathouse._id))
            .collect();

        const existingPortal = existingObjects.find(obj => obj.name === "The Heavy Door");
        if (existingPortal) {
            return { status: "exists", id: existingPortal._id };
        }

        // Create the portal object (no revealId needed - it navigates instead)
        const portalId = await ctx.db.insert("objects", {
            sceneId: boathouse._id,
            name: "The Heavy Door",
            x: 88,
            y: 50,
            hint: "Descent",
            role: "transition",
            destinationSlug: "/luminous-deep",
        });

        return { status: "created", id: portalId };
    }
});

// ═══════════════════════════════════════════════════════════════
// EXPANSION: ORANGERY & SANCTUARY
// ═══════════════════════════════════════════════════════════════
export const seedExpansion = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. The Orangery
        await upsertSceneFull(
            ctx,
            "orangery",
            "The Orangery",
            "orangery",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766691940/orangery_fnhmne.png",
            [
                {
                    name: "Glass Pane",
                    x: 30, y: 50,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Condensation",
                    revealContent: "The air here is thick, humid. Plants thrive on the moisture that runs down the glass. It is a place of breath, of biology overtaking structure.",
                    hint: "Inspect the glass",
                    voice: "cassie",
                    revealTags: ["nature", "growth"]
                },
                {
                    name: "Hearth Door",
                    x: 10, y: 60,
                    role: "transition",
                    destinationSlug: "/lounge",
                    hint: "Return to Hearth"
                },
                {
                    name: "Sanctuary Path",
                    x: 80, y: 50,
                    role: "transition",
                    destinationSlug: "/sanctuary",
                    hint: "Enter Sanctuary"
                }
            ],
            ["nature", "growth", "health"]
        );

        // 2. The Sanctuary
        await upsertSceneFull(
            ctx,
            "sanctuary",
            "The Sanctuary",
            "sanctuary",
            "https://res.cloudinary.com/dptqxjhb8/image/upload/v1766747029/secret_room_va2d3l.png",
            [
                {
                    name: "The Mirror",
                    x: 50, y: 50,
                    role: "canon",
                    revealType: "text",
                    revealTitle: "Reflection",
                    revealContent: "There is no noise here. Only the sound of your own thoughts. It is uncomfortable at first, then essential.",
                    hint: "Look into mirror",
                    voice: "neutral",
                    revealTags: ["private", "self"]
                },
                {
                    name: "Orangery Door",
                    x: 50, y: 80,
                    role: "transition",
                    destinationSlug: "/orangery",
                    hint: "Return to Orangery"
                }
            ],
            ["private", "secret"]
        );

        return "Seeded Expansion: Orangery & Sanctuary";
    }
});

