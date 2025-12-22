import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        tokenIdentifier: v.string(),
        role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    }).index("by_token", ["tokenIdentifier"]),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #1: SPACES (Evolved from scenes)
    // The rooms of the narrative house
    // ═══════════════════════════════════════════════════════════════
    scenes: defineTable({
        slug: v.string(),
        title: v.string(),
        domain: v.union(
            v.literal("workshop"),
            v.literal("study"),
            v.literal("boathouse"),
            v.literal("home"),
            v.literal("lounge"),
            v.literal("kitchen"),
            v.literal("luminous-deep") // The Control Room (Sub-Basement)
        ),
        backgroundMediaUrl: v.string(),
        isPublished: v.boolean(),
        playbackSpeed: v.optional(v.number()),
        shouldLoop: v.optional(v.boolean()), // false = play once and hold on final frame
        // Naming Standard v1 Metadata
        variant: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        // NEW: Space Evolution Fields
        tagline: v.optional(v.string()), // e.g., "Where ideas take form"
        mood: v.optional(v.array(v.string())), // e.g., ["focused", "warm", "creative"]
        allowedTools: v.optional(v.array(v.string())), // e.g., ["search", "generate", "analyze"]
        ambientAudioUrl: v.optional(v.string()), // Room-specific soundscape
    }).index("by_slug", ["slug"]).index("by_domain", ["domain"]),

    objects: defineTable({
        sceneId: v.id("scenes"),
        name: v.string(),
        x: v.number(),
        y: v.number(),
        hint: v.string(),
        revealId: v.optional(v.id("reveals")), // Optional for portal/transition objects
        // Naming Standard v1 Metadata
        role: v.optional(v.string()), // e.g. 'transition', 'reveal', 'trigger'
        destinationSlug: v.optional(v.string()), // For transition objects: where they lead (e.g. "/luminous-deep")
    }).index("by_scene", ["sceneId"]),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #2: ARTEFACTS (Evolved from reveals)
    // The content pieces produced by agents or humans
    // ═══════════════════════════════════════════════════════════════
    reveals: defineTable({
        title: v.string(),
        type: v.union(v.literal("text"), v.literal("audio"), v.literal("video"), v.literal("image")),
        content: v.string(),
        mediaUrl: v.optional(v.string()),
        // Naming Standard v1 Metadata
        voice: v.optional(v.union(
            v.literal("cassie"),
            v.literal("eleanor"),
            v.literal("julian"),
            v.literal("sparkline"),
            v.literal("hearth"),
            v.literal("systems"),
            v.literal("neutral")
        )),
        tone: v.optional(v.string()),
        estimatedTime: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        role: v.optional(v.string()), // e.g. 'canon', 'clue', 'flavor'
        // Workflow Fields
        status: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        // NEW: Artefact Evolution Fields
        artefactType: v.optional(v.union(
            v.literal("prompt"),
            v.literal("regulation"),
            v.literal("note"),
            v.literal("script")
        )),
        truthMode: v.optional(v.union(
            v.literal("factual"),   // Sharp, documented, verifiable
            v.literal("creative")   // Atmospheric, evocative, imaginative
        )),
        spaceId: v.optional(v.id("scenes")), // Which space this artefact belongs to
        // Narrative Calendar
        phase: v.optional(v.union(
            v.literal("early_year"),
            v.literal("spring"),
            v.literal("summer"),
            v.literal("autumn"),
            v.literal("winter")
        )),
        // Vector Embedding (Gemini text-embedding-004: 768 dimensions)
        embedding: v.optional(v.array(v.float64())),
        // Multimodal: AI-suggested image prompt
        imagePrompt: v.optional(v.string()),
    }).vectorIndex("by_embedding", {
        dimensions: 768,
        vectorField: "embedding",
        filterFields: ["voice", "status"],
    }),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #3: AGENTS
    // The AI personalities that inhabit the spaces
    // ═══════════════════════════════════════════════════════════════
    agents: defineTable({
        name: v.string(), // e.g., "Julian", "Eleanor", "Cassie"
        homeSpaceId: v.optional(v.id("scenes")), // Their primary residence (optional until assigned)
        role: v.string(), // e.g., "Analyst", "Curator", "Maker"
        description: v.optional(v.string()), // Agent's personality/purpose
        capabilities: v.array(v.string()), // e.g., ["read_tides", "analyze_data", "navigate"]
        tools: v.array(v.string()), // e.g., ["search", "generate", "summarize"]
        autonomy: v.number(), // 1-5 scale: 1=reactive only, 5=fully autonomous
        voice: v.optional(v.union(
            v.literal("cassie"),
            v.literal("eleanor"),
            v.literal("julian"),
            v.literal("sparkline"),
            v.literal("hearth"),
            v.literal("systems"),
            v.literal("neutral")
        )),
        isActive: v.boolean(),
        createdAt: v.number(),
    }).index("by_space", ["homeSpaceId"]).index("by_name", ["name"]),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #4: WORKFLOWS
    // The choreographed sequences of agent actions
    // ═══════════════════════════════════════════════════════════════
    workflows: defineTable({
        name: v.string(), // e.g., "Morning Tide Analysis"
        spaceId: v.id("scenes"), // Where this workflow runs
        description: v.optional(v.string()),
        trigger: v.object({
            type: v.union(
                v.literal("manual"),
                v.literal("schedule"),
                v.literal("event"),
                v.literal("condition")
            ),
            config: v.optional(v.any()), // Trigger-specific configuration
        }),
        steps: v.array(v.object({
            order: v.number(),
            agentId: v.optional(v.id("agents")), // Which agent performs this step
            action: v.string(), // e.g., "analyze", "generate", "notify"
            params: v.optional(v.any()), // Action-specific parameters
            inputFrom: v.optional(v.number()), // Step order to take input from
        })),
        isActive: v.boolean(),
        createdAt: v.number(),
    }).index("by_space", ["spaceId"]),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #5: RUNS
    // The execution logs of workflow instances
    // ═══════════════════════════════════════════════════════════════
    runs: defineTable({
        workflowId: v.optional(v.id("workflows")), // Optional for ad-hoc runs
        workflowName: v.optional(v.string()), // For ad-hoc runs without formal workflow (e.g., "NARRATIVE_REFINEMENT")
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("cancelled")
        ),
        logs: v.array(v.object({
            timestamp: v.number(),
            stepOrder: v.number(),
            agentId: v.optional(v.id("agents")),
            message: v.string(),
            level: v.union(v.literal("info"), v.literal("warn"), v.literal("error"), v.literal("debug")),
            data: v.optional(v.any()),
        })),
        producedArtefactIds: v.array(v.id("reveals")), // Artefacts created during this run
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        triggeredBy: v.optional(v.string()), // User ID or "system"
    }).index("by_workflow", ["workflowId"]).index("by_status", ["status"]),

    chapters: defineTable({
        slug: v.string(),
        title: v.string(),
        content: v.string(),
        status: v.union(v.literal("draft"), v.literal("published")),
    }).index("by_slug", ["slug"]),

    contentPacks: defineTable({
        hotspotId: v.string(),
        domain: v.string(),
        sceneId: v.id("scenes"),
        title: v.string(),
        revealType: v.string(),
        bodyCopy: v.string(),
        hintLine: v.optional(v.string()),
        tags: v.array(v.string()),
        canonRefs: v.array(v.string()),
        mediaRefs: v.string(),
        status: v.union(v.literal("Draft"), v.literal("Review"), v.literal("Published")),
        version: v.number(),
        lastReviewedBy: v.optional(v.string()),
        canonCheckResult: v.optional(v.string()),
        // Audit fields
        importedBy: v.string(), // Clerk userId
        sourceFile: v.optional(v.string()),
        phase: v.optional(v.union(
            v.literal("early_year"),
            v.literal("spring"),
            v.literal("summer"),
            v.literal("autumn"),
            v.literal("winter")
        )),
    }).index("by_scene", ["sceneId"]).index("by_hotspot", ["hotspotId"]),

    contentPacksHistory: defineTable({
        packId: v.id("contentPacks"),
        hotspotId: v.string(),
        data: v.any(), // Snapshot of the pack data
        archivedAt: v.number(),
        archivedBy: v.string(),
    }).index("by_pack", ["packId"]).index("by_hotspot", ["hotspotId"]),

    media: defineTable({
        publicId: v.string(),
        url: v.string(),
        resourceType: v.string(), // image, video, raw
        folder: v.optional(v.string()),
        format: v.string(),
        bytes: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        // Visual Bible: Mark assets for AI reference
        isVisualBible: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
        // SynthID: AI-generation verification
        synthIdStatus: v.optional(v.string()),
    }).index("by_public_id", ["publicId"]).index("by_visual_bible", ["isVisualBible"]),

    // ═══════════════════════════════════════════════════════════════
    // CANONICAL OBJECT #8: CAMPAIGNS (Social Command Centre)
    // Multi-platform social media campaign management
    // ═══════════════════════════════════════════════════════════════
    campaigns: defineTable({
        title: v.string(), // e.g., "The London Infrastructure Keynote"
        platform: v.union(
            v.literal("X"),
            v.literal("Instagram"),
            v.literal("Facebook"),
            v.literal("LinkedIn")
        ),
        agentId: v.id("agents"), // Which agent is the "voice" of this campaign
        status: v.union(
            v.literal("planning"),
            v.literal("generated"),
            v.literal("scheduled"),
            v.literal("posted")
        ),
        // Visual Bible: Reference images for character consistency
        visualBibleIds: v.optional(v.array(v.id("media"))),
        // Generated content
        postCopy: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        imagePrompt: v.optional(v.string()),
        // Scheduling
        scheduledAt: v.optional(v.number()),
        postedAt: v.optional(v.number()),
        // Metadata
        createdBy: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_agent", ["agentId"]).index("by_status", ["status"]).index("by_platform", ["platform"]),
});
