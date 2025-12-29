import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// AGENT MANDATES — Constitution Registry
// Versioned, immutable instruction sets for each agent.
// Authority, not content. No delete, only retire.
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise slug: lowercase, hyphen-separated, no special chars
 */
function normaliseSlug(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

/**
 * Canonicalise content for consistent checksumming
 * - Trim trailing whitespace per line
 * - Normalise line endings to \n
 * - Trim leading/trailing whitespace
 */
function canonicaliseContent(content: string): string {
    return content
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();
}

/**
 * Compute SHA-256 checksum (browser-compatible)
 */
async function computeChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * List all mandates (admin view)
 */
export const listMandates = query({
    handler: async (ctx) => {
        return await ctx.db.query("agent_mandates").collect();
    },
});

/**
 * List mandates by agent
 */
export const listMandatesByAgent = query({
    args: { agentId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("agent_mandates")
            .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
            .collect();
    },
});

/**
 * Get active mandates (status = "active") for all agents
 */
export const listActiveMandates = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("agent_mandates")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();
    },
});

/**
 * Get an agent's currently assigned mandate (via agent.activeMandateId)
 * This is the runtime query for loading agent context.
 */
export const getActiveMandate = query({
    args: { agentId: v.string() },
    handler: async (ctx, args) => {
        // Find agent by name (lowercase)
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_name", (q) => q.eq("name", args.agentId))
            .first();

        if (!agent || !agent.activeMandateId) {
            return null;
        }

        return await ctx.db.get(agent.activeMandateId);
    },
});

/**
 * Get a single mandate by ID
 */
export const getMandate = query({
    args: { id: v.id("agent_mandates") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Save a mandate draft.
 * Does not activate — just saves with status: "draft"
 */
export const saveMandateDraft = mutation({
    args: {
        id: v.optional(v.id("agent_mandates")), // For editing existing draft
        agentId: v.string(),
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        createdBy: v.string(),
    },
    handler: async (ctx, args) => {
        const normalisedSlug = normaliseSlug(args.slug);
        const canonicalContent = canonicaliseContent(args.content);
        const checksum = await computeChecksum(canonicalContent);

        if (args.id) {
            // Update existing draft
            const existing = await ctx.db.get(args.id);
            if (!existing) throw new Error("Mandate not found");
            if (existing.status !== "draft") {
                throw new Error("Cannot edit a mandate that is not a draft");
            }

            await ctx.db.patch(args.id, {
                title: args.title,
                slug: normalisedSlug,
                content: canonicalContent,
                checksum,
                contentLength: canonicalContent.length,
            });
            return args.id;
        } else {
            // Create new draft
            return await ctx.db.insert("agent_mandates", {
                agentId: args.agentId,
                title: args.title,
                slug: normalisedSlug,
                content: canonicalContent,
                version: 1,
                status: "draft",
                createdAt: Date.now(),
                createdBy: args.createdBy,
                checksum,
                hashAlgo: "sha256",
                contentLength: canonicalContent.length,
            });
        }
    },
});

/**
 * Publish a mandate.
 * - If publishing a draft: promotes it to "active"
 * - If publishing a new version: creates new entry with previousVersionId
 */
export const publishMandate = mutation({
    args: {
        id: v.optional(v.id("agent_mandates")), // Existing draft to promote
        agentId: v.string(),
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        createdBy: v.string(),
        publishedBy: v.string(),
    },
    handler: async (ctx, args) => {
        const normalisedSlug = normaliseSlug(args.slug);
        const canonicalContent = canonicaliseContent(args.content);
        const checksum = await computeChecksum(canonicalContent);
        const now = Date.now();

        // Check if promoting an existing draft
        if (args.id) {
            const existing = await ctx.db.get(args.id);
            if (!existing) throw new Error("Mandate not found");
            if (existing.status !== "draft") {
                throw new Error("Can only publish a draft mandate");
            }

            await ctx.db.patch(args.id, {
                title: args.title,
                slug: normalisedSlug,
                content: canonicalContent,
                status: "active",
                publishedAt: now,
                publishedBy: args.publishedBy,
                checksum,
                contentLength: canonicalContent.length,
            });
            return args.id;
        }

        // Check for existing active mandate with same agent+slug
        const existingActive = await ctx.db
            .query("agent_mandates")
            .withIndex("by_agent_slug", (q) =>
                q.eq("agentId", args.agentId).eq("slug", normalisedSlug)
            )
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        let newVersion = 1;
        let previousVersionId = undefined;

        if (existingActive) {
            // This is a new version — retire the old one
            newVersion = (existingActive.version || 1) + 1;
            previousVersionId = existingActive._id;

            // Retire the previous version
            await ctx.db.patch(existingActive._id, {
                status: "retired",
                retiredAt: now,
                retiredBy: "system:superseded",
                retireReason: `Superseded by version ${newVersion}`,
            });
        }

        // Create new active mandate
        const newId = await ctx.db.insert("agent_mandates", {
            agentId: args.agentId,
            title: args.title,
            slug: normalisedSlug,
            content: canonicalContent,
            version: newVersion,
            previousVersionId,
            status: "active",
            createdAt: now,
            createdBy: args.createdBy,
            publishedAt: now,
            publishedBy: args.publishedBy,
            checksum,
            hashAlgo: "sha256",
            contentLength: canonicalContent.length,
        });

        // Update supersededById on the old version
        if (existingActive) {
            await ctx.db.patch(existingActive._id, {
                supersededById: newId,
            });
        }

        return newId;
    },
});

/**
 * Assign a mandate to an agent.
 * Updates the agent's activeMandateId pointer.
 */
export const assignMandate = mutation({
    args: {
        agentName: v.string(),
        mandateId: v.id("agent_mandates"),
    },
    handler: async (ctx, args) => {
        // Find agent by name
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_name", (q) => q.eq("name", args.agentName))
            .first();

        if (!agent) {
            throw new Error(`Agent "${args.agentName}" not found`);
        }

        // Validate mandate exists and is active
        const mandate = await ctx.db.get(args.mandateId);
        if (!mandate) {
            throw new Error("Mandate not found");
        }
        if (mandate.status !== "active") {
            throw new Error(`Cannot assign mandate with status "${mandate.status}". Only active mandates can be assigned.`);
        }
        if (mandate.agentId.toLowerCase() !== args.agentName.toLowerCase()) {
            throw new Error(`Mandate belongs to agent "${mandate.agentId}", cannot assign to "${args.agentName}"`);
        }

        // Update agent's active mandate
        await ctx.db.patch(agent._id, {
            activeMandateId: args.mandateId,
        });

        return { success: true, agentId: agent._id, mandateId: args.mandateId };
    },
});

/**
 * Unassign mandate from an agent (clear activeMandateId)
 */
export const unassignMandate = mutation({
    args: { agentName: v.string() },
    handler: async (ctx, args) => {
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_name", (q) => q.eq("name", args.agentName))
            .first();

        if (!agent) {
            throw new Error(`Agent "${args.agentName}" not found`);
        }

        await ctx.db.patch(agent._id, {
            activeMandateId: undefined,
        });

        return { success: true };
    },
});

/**
 * Retire a mandate (no delete!).
 * Cannot retire if actively assigned to an agent.
 */
export const retireMandate = mutation({
    args: {
        id: v.id("agent_mandates"),
        reason: v.string(),
        retiredBy: v.string(),
    },
    handler: async (ctx, args) => {
        const mandate = await ctx.db.get(args.id);
        if (!mandate) throw new Error("Mandate not found");

        if (mandate.status === "retired") {
            throw new Error("Mandate is already retired");
        }

        // Check if any agent has this as their active mandate
        const agents = await ctx.db.query("agents").collect();
        for (const agent of agents) {
            if (agent.activeMandateId?.toString() === args.id.toString()) {
                throw new Error(
                    `Cannot retire mandate: it is currently assigned to agent "${agent.name}". Unassign first.`
                );
            }
        }

        await ctx.db.patch(args.id, {
            status: "retired",
            retiredAt: Date.now(),
            retiredBy: args.retiredBy,
            retireReason: args.reason,
        });

        return { success: true };
    },
});

// ═══════════════════════════════════════════════════════════════
// RUNTIME CONTEXT — Agent Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Get agent context for runtime generation.
 * Returns:
 * - worldCanon: All locked canon_vault entries (global truths)
 * - mandate: The agent's own active mandate only
 * 
 * ISOLATION: Agent never sees other agents' mandates.
 * Mandates are CONFIGURATION, not KNOWLEDGE.
 */
export const getAgentContext = query({
    args: { agentId: v.string() },
    handler: async (ctx, args) => {
        // Get world canon (only locked entries)
        const worldCanon = await ctx.db
            .query("canon_vault")
            .filter((q) => q.neq(q.field("lockedAt"), undefined))
            .collect();

        // Get agent's active mandate
        const agent = await ctx.db
            .query("agents")
            .withIndex("by_name", (q) => q.eq("name", args.agentId))
            .first();

        let mandate = null;
        if (agent?.activeMandateId) {
            mandate = await ctx.db.get(agent.activeMandateId);
        }

        return {
            worldCanon: worldCanon.map(c => ({
                title: c.title,
                content: c.content,
                version: c.version,
            })),
            mandate: mandate ? {
                title: mandate.title,
                content: mandate.content,
                version: mandate.version,
                checksum: mandate.checksum.slice(0, 8), // Short form
            } : null,
            agentName: agent?.name || args.agentId,
        };
    },
});
