import { QueryCtx, MutationCtx } from "../_generated/server";

export async function requireStudioAccess(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthenticated call to studio function");
    }
    // TODO: Add role check here (e.g. check allowlist in env or database)
    return identity;
}
