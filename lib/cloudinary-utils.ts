// ═══════════════════════════════════════════════════════════════
// CLOUDINARY UTILITIES - High-Resolution Social Export
// Optimized for 4K quality preservation on external platforms
// ═══════════════════════════════════════════════════════════════

/**
 * Platform-specific aspect ratios and optimal dimensions
 */
export const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number; aspectRatio: string }> = {
    X: { width: 1920, height: 1080, aspectRatio: "16:9" },
    Instagram: { width: 1080, height: 1080, aspectRatio: "1:1" },
    InstagramStory: { width: 1080, height: 1920, aspectRatio: "9:16" },
    Facebook: { width: 1200, height: 630, aspectRatio: "1.91:1" },
    LinkedIn: { width: 1200, height: 627, aspectRatio: "1.91:1" },
    YouTube: { width: 2560, height: 1440, aspectRatio: "16:9" },
};

/**
 * Get a high-resolution, sharpened URL for social media export
 * Uses Cloudinary's transformation pipeline to maximize quality
 * 
 * @param baseUrl - The original Cloudinary image URL
 * @param platform - Target social media platform
 * @returns Optimized URL with quality enhancements
 */
export function getHighResSocialUrl(
    baseUrl: string,
    platform: keyof typeof PLATFORM_DIMENSIONS = "X"
): string {
    if (!baseUrl || !baseUrl.includes("cloudinary.com")) {
        return baseUrl;
    }

    const dims = PLATFORM_DIMENSIONS[platform] || PLATFORM_DIMENSIONS.X;

    // Build the transformation chain for maximum quality
    const transformations = [
        // Resize to optimal dimensions with smart cropping
        `c_fill,w_${dims.width},h_${dims.height},g_auto:subject`,

        // Unsharp mask for crisp edges (amount:100, radius:0.5, threshold:0)
        "e_unsharp_mask:100",

        // Auto-enhance for best possible quality
        "e_auto_contrast",

        // Maximum quality - use q_auto:best for intelligent compression
        "q_auto:best",

        // Force high-quality format (WebP with PNG fallback)
        "f_auto",

        // DPR 2x for retina displays
        "dpr_2.0",

        // ═══════════════════════════════════════════════════════════════
        // PROVENANCE STAMP: Cognitive Lock Verification
        // ═══════════════════════════════════════════════════════════════
        // Text: 'Broadcasting from The Luminous Deep'
        // Style: Transport Typography (Arial/Helvetica style), 40% opacity, bottom-right
        "l_text:Arial_25_bold_tracking_2:Broadcasting%20from%20The%20Luminous%20Deep,co_white,o_40",
        "fl_layer_apply,g_south_east,x_40,y_40",
    ].join(",");

    // Insert transformations into the URL
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/[transformations]/public_id
    const urlParts = baseUrl.split("/upload/");
    if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
    }

    return baseUrl;
}

/**
 * Get a download-ready URL for the asset with metadata
 * @param baseUrl - The original Cloudinary image URL
 * @param filename - Desired download filename
 * @returns URL that will trigger a download with proper filename
 */
export function getDownloadUrl(baseUrl: string, filename: string): string {
    if (!baseUrl || !baseUrl.includes("cloudinary.com")) {
        return baseUrl;
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const transformations = `fl_attachment:${sanitizedFilename}`;

    const urlParts = baseUrl.split("/upload/");
    if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
    }

    return baseUrl;
}

/**
 * Generate a thumbnail URL for previews
 * @param baseUrl - The original Cloudinary image URL
 * @param size - Thumbnail size in pixels (default 200)
 * @returns Optimized thumbnail URL
 */
export function getThumbnailUrl(baseUrl: string, size: number = 200): string {
    if (!baseUrl || !baseUrl.includes("cloudinary.com")) {
        return baseUrl;
    }

    const transformations = [
        `c_thumb,w_${size},h_${size},g_face`,
        "q_auto:good",
        "f_auto",
    ].join(",");

    const urlParts = baseUrl.split("/upload/");
    if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
    }

    return baseUrl;
}

/**
 * Get URL with Visual Bible watermark for drafts
 * @param baseUrl - The original Cloudinary image URL
 * @returns URL with "DRAFT" watermark overlay
 */
export function getDraftWatermarkUrl(baseUrl: string): string {
    if (!baseUrl || !baseUrl.includes("cloudinary.com")) {
        return baseUrl;
    }

    const transformations = [
        // Original quality
        "q_auto:best",
        // Add semi-transparent "DRAFT" overlay
        "l_text:Arial_80_bold:DRAFT,co_white,o_30",
        "fl_layer_apply,g_center",
    ].join("/");

    const urlParts = baseUrl.split("/upload/");
    if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
    }

    return baseUrl;
}

/**
 * Get optimized video thumbnail from a video URL
 * @param videoUrl - The original Cloudinary video URL
 * @param timestamp - Time in seconds for thumbnail extraction
 * @returns Optimized video thumbnail URL
 */
export function getVideoThumbnail(videoUrl: string, timestamp: number = 0): string {
    if (!videoUrl || !videoUrl.includes("cloudinary.com")) {
        return videoUrl;
    }

    // Convert video URL to image and extract frame
    const imageUrl = videoUrl.replace("/video/upload/", "/video/upload/so_" + timestamp + ",c_thumb,w_400,h_400,g_auto/");

    // Change extension to jpg
    return imageUrl.replace(/\.[^.]+$/, ".jpg");
}
