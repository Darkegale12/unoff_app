import json
import os


def _cell_polygon_from_pixels(cell, frame_shape, geo_origin=(0.0, 0.0), geo_scale=(1e-4, 1e-4)):
    h, w = frame_shape[:2]
    x0 = float(cell["x"])
    y0 = float(cell["y"])
    x1 = float(cell["x"] + cell.get("width", 1))
    y1 = float(cell["y"] + cell.get("height", 1))

    # Normalize image coords and project to pseudo-lon/lat when real geo is unavailable.
    ox, oy = float(geo_origin[0]), float(geo_origin[1])
    sx, sy = float(geo_scale[0]), float(geo_scale[1])

    def pix_to_lonlat(px, py):
        nx = (px / max(1.0, float(w)))
        ny = (py / max(1.0, float(h)))
        lon = ox + (nx * sx)
        lat = oy + (ny * sy)
        return [lon, lat]

    p00 = pix_to_lonlat(x0, y0)
    p10 = pix_to_lonlat(x1, y0)
    p11 = pix_to_lonlat(x1, y1)
    p01 = pix_to_lonlat(x0, y1)
    return [p00, p10, p11, p01, p00]


def build_geojson_feature_collection(frame_payload, frame_shape, geo_origin=(0.0, 0.0), geo_scale=(1e-4, 1e-4)):
    features = []
    for cell in frame_payload.get("cells", []):
        f = cell.get("features", {})
        polygon = _cell_polygon_from_pixels(cell, frame_shape, geo_origin=geo_origin, geo_scale=geo_scale)
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [polygon]},
                "properties": {
                    "frame_id": frame_payload.get("frame_id"),
                    "timestamp": frame_payload.get("timestamp"),
                    "cell_id": cell.get("cell_id"),
                    "water": float(f.get("water", 0.5)),
                    "vegetation": float(f.get("vegetation", 0.5)),
                    "shadow": float(f.get("shadow", 0.5)),
                    "water_proximity": float(f.get("water_proximity", 0.5)),
                    "risk_proxy": float(f.get("stagnant_water", 0.5)),
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


def save_geojson(geojson_obj, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson_obj, f, indent=2)
