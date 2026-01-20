/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 */

export interface Coordinates {
    lat: number;
    lng: number;
}

const cache = new Map<string, Coordinates>();

export async function geocode(address: string): Promise<Coordinates | null> {
    if (!address || address.toLowerCase() === "tbd" || address.toLowerCase() === "us") {
        return null;
    }

    if (cache.has(address)) {
        return cache.get(address)!;
    }

    try {
        // Adding a delay to respect Nominatim's usage policy (1 request per second)
        // In a real app, we might want a more robust queuing system or a paid provider
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'Likelee-AI-Scouting-Map/1.0'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            const coords = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
            };
            cache.set(address, coords);
            return coords;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
    }

    return null;
}
