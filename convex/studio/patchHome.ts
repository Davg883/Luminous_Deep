import { mutation } from "../_generated/server";

export const setHomeVideo = mutation({
    args: {},
    handler: async (ctx) => {
        const home = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", "home"))
            .first();

        const videoUrl = "https://res.cloudinary.com/dptqxjhb8/video/upload/v1766235172/House_video_z7n1yj.mp4";

        if (home) {
            await ctx.db.patch(home._id, {
                backgroundMediaUrl: videoUrl,
                domain: "home" as "workshop" | "study" | "boathouse" | "home",
                title: "Seagrove Bay",
            });
        } else {
            await ctx.db.insert("scenes", {
                slug: "home",
                title: "Seagrove Bay",
                domain: "home" as "workshop" | "study" | "boathouse" | "home",
                backgroundMediaUrl: videoUrl,
                isPublished: true,
            });
        }
        return "Home Video Set";
    },
});
