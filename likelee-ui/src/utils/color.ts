export const ensureHexColor = (color: any, fallback: string = "#6366F1"): string => {
    if (!color || typeof color !== "string") return fallback;

    // Basic hex regex (3 or 6 chars)
    const isHex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color);
    if (isHex) return color;

    // Support for 8-char hex (RGBA hex) - Browser <input type="color"> only supports #RRGGBB
    const isHex8 = /^#([A-Fa-f0-9]{8})$/.test(color);
    if (isHex8) return color.substring(0, 7);

    // If it's rgba, rgb, or anything else, just return fallback for the color input
    // More complex conversion could be added if needed, but fallback is safer for now.
    return fallback;
};
