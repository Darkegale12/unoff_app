/**
 * SpectralLoader — Lazy loads DataTeam GeoJSON files and extracts
 * spectral band values near a given lat/lon (within a grid cell).
 *
 * DataTeam files are ~4.5 MB each (8,985 Point features).
 * We fetch on-demand and filter by proximity to the clicked cell.
 */

export interface SpectralValues {
  ndvi: number | null;
  ndwi: number | null;
  ndbi: number | null;
  mndwi: number | null;
  ndmi: number | null;
  lst: number | null;
}

interface GeoJSONPoint {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    timestamp: string;
    source: string;
    features: Record<string, number>;
    quality: { valid: boolean };
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONPoint[];
}

// Available sample files (pre-copied to public/data/datateam/)
const BAND_FILES: Record<string, string> = {
  ndvi: '/data/datateam/ndvi_2025-01-03.geojson',
  ndwi: '/data/datateam/ndwi_2025-01-03.geojson',
  ndbi: '/data/datateam/ndbi_2025-01-03.geojson',
  mndwi: '/data/datateam/mndwi_2025-01-03.geojson',
  ndmi: '/data/datateam/ndmi_2025-01-03.geojson',
  lst: '/data/datateam/lst_2025-01-29.geojson',
};

// Cache loaded files to avoid re-fetching
const cache: Map<string, GeoJSONCollection> = new Map();

async function loadBandFile(band: string): Promise<GeoJSONCollection | null> {
  const url = BAND_FILES[band];
  if (!url) return null;

  if (cache.has(band)) return cache.get(band)!;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(band, data);
    return data;
  } catch (e) {
    console.warn(`Failed to load spectral band ${band}:`, e);
    return null;
  }
}

/**
 * Extracts spectral values for a risk grid cell.
 *
 * @param cellLat - Center latitude of the cell
 * @param cellLon - Center longitude of the cell
 * @param cellSize - Size of grid cell in degrees (default 0.01)
 * @returns Averaged spectral values for all bands within the cell
 */
export async function loadSpectralForCell(
  cellLat: number,
  cellLon: number,
  cellSize: number = 0.01
): Promise<SpectralValues> {
  const halfCell = cellSize / 2;
  const result: SpectralValues = {
    ndvi: null,
    ndwi: null,
    ndbi: null,
    mndwi: null,
    ndmi: null,
    lst: null,
  };

  const bands = Object.keys(BAND_FILES);

  // Load all bands in parallel
  const loadResults = await Promise.all(
    bands.map(async (band) => {
      const data = await loadBandFile(band);
      if (!data) return { band, value: null };

      // Filter features within the cell bounds
      const cellFeatures = data.features.filter((f) => {
        if (!f.properties.quality.valid) return false;
        const [lon, lat] = f.geometry.coordinates;
        return (
          lat >= cellLat - halfCell &&
          lat <= cellLat + halfCell &&
          lon >= cellLon - halfCell &&
          lon <= cellLon + halfCell
        );
      });

      if (cellFeatures.length === 0) return { band, value: null };

      // Average the band values
      const bandKey = band === 'lst' ? 'lst' : band;
      const sum = cellFeatures.reduce((s, f) => {
        const val = f.properties.features[bandKey];
        return s + (typeof val === 'number' ? val : 0);
      }, 0);

      return { band, value: sum / cellFeatures.length };
    })
  );

  for (const { band, value } of loadResults) {
    if (value !== null) {
      (result as any)[band] = value;
    }
  }

  return result;
}

/**
 * Clears the cache, e.g., when switching time periods.
 */
export function clearSpectralCache(): void {
  cache.clear();
}
