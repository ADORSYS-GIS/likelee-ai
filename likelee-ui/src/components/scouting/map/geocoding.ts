import { base44 } from "@/api/base44Client";

export interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
}

const cache = new Map<string, Coordinates>();

export async function geocode(address: string): Promise<Coordinates | null> {
  if (
    !address ||
    address.toLowerCase() === "tbd" ||
    address.toLowerCase() === "us"
  ) {
    return null;
  }

  if (cache.has(address)) {
    return cache.get(address)!;
  }

  try {
    const data = await base44.get<GeocodeResult[]>("scouting/geocode", {
      params: { q: address, limit: 1 },
    });

    if (data && Array.isArray(data) && data.length > 0) {
      const coords = {
        lat: data[0].lat,
        lng: data[0].lng,
      };
      cache.set(address, coords);
      return coords;
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

export async function searchLocations(
  query: string,
): Promise<{ name: string; lat: number; lng: number }[]> {
  if (!query || query.length < 3) return [];

  try {
    const data = await base44.get<GeocodeResult[]>("scouting/geocode", {
      params: { q: query, limit: 5 },
    });
    return data;
  } catch (error) {
    console.error("Location search error:", error);
  }

  return [];
}
