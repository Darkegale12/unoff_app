import json
import os
from datetime import datetime, timedelta

import cv2
import numpy as np


DEFAULT_CONFIG = {
    "grid_size": 16,
    "weights": {
        "water_presence": 0.5,
        "low_motion_proxy": 0.2,
        "vegetation_nearby": 0.2,
        "shadow_presence": 0.1,
    },
    "vegetation_blur_kernel": 21,
}


def _safe_float_map(mask):
    arr = np.asarray(mask, dtype=np.float32)
    if arr.size == 0:
        return arr
    if np.nanmax(arr) > 1.0:
        arr = arr / 255.0
    return np.nan_to_num(arr, nan=0.5, posinf=1.0, neginf=0.0).clip(0.0, 1.0)


def _normalize_map(arr, mid_if_flat=0.5):
    arr = np.asarray(arr, dtype=np.float32)
    arr = np.nan_to_num(arr, nan=mid_if_flat, posinf=1.0, neginf=0.0)
    lo = float(np.min(arr)) if arr.size else 0.0
    hi = float(np.max(arr)) if arr.size else 1.0
    if hi - lo < 1e-6:
        return np.full_like(arr, mid_if_flat, dtype=np.float32)
    return ((arr - lo) / (hi - lo)).clip(0.0, 1.0)


def load_derived_config(config_path):
    config = dict(DEFAULT_CONFIG)
    if not config_path or not os.path.exists(config_path):
        return config

    parsed = None
    try:
        import yaml  # Optional dependency

        with open(config_path, "r", encoding="utf-8") as f:
            parsed = yaml.safe_load(f)
    except Exception:
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                parsed = json.load(f)
        except Exception:
            parsed = None

    if not isinstance(parsed, dict):
        return config

    config["grid_size"] = int(parsed.get("grid_size", config["grid_size"]))
    config["vegetation_blur_kernel"] = int(
        parsed.get("vegetation_blur_kernel", config["vegetation_blur_kernel"])
    )
    config["weights"] = dict(config["weights"])
    for k in config["weights"]:
        if isinstance(parsed.get("weights", {}), dict) and k in parsed["weights"]:
            config["weights"][k] = float(parsed["weights"][k])
    return config


def compute_water_proximity(water_mask):
    water = _safe_float_map(water_mask)
    water_bin = (water > 0.5).astype(np.uint8)

    if float(np.mean(water_bin)) < 1e-6:
        return np.full(water.shape, 0.5, dtype=np.float32)

    inverted = 1 - water_bin
    distance = cv2.distanceTransform(inverted, cv2.DIST_L2, 5)
    if float(np.max(distance)) < 1e-6:
        return np.ones_like(distance, dtype=np.float32)
    distance_norm = distance / float(np.max(distance))
    return (1.0 - distance_norm).clip(0.0, 1.0).astype(np.float32)


def compute_vegetation_density(vegetation_mask, blur_kernel=21):
    vegetation = _safe_float_map(vegetation_mask)
    k = max(3, int(blur_kernel))
    if k % 2 == 0:
        k += 1
    density = cv2.GaussianBlur(vegetation, (k, k), 0)
    return _normalize_map(density, mid_if_flat=0.5).astype(np.float32)


def _compute_low_motion_proxy(frame_bgr):
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = gray.astype(np.float32) / 255.0
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
    abs_lap = np.abs(lap)
    # Smooth local edge-energy to estimate texture uniformity
    edge_energy = cv2.GaussianBlur(abs_lap, (9, 9), 0)
    # Lower edge variance -> higher low-motion proxy
    return (1.0 - _normalize_map(edge_energy, mid_if_flat=0.5)).astype(np.float32)


def compute_stagnant_water(
    water_mask,
    vegetation_density_map,
    shadow_mask,
    low_motion_proxy,
    weights,
):
    water = _safe_float_map(water_mask)
    shadow = _safe_float_map(shadow_mask)
    vegetation = _safe_float_map(vegetation_density_map)
    low_motion = _safe_float_map(low_motion_proxy)

    score = (
        water * float(weights.get("water_presence", 0.5))
        + low_motion * float(weights.get("low_motion_proxy", 0.2))
        + vegetation * float(weights.get("vegetation_nearby", 0.2))
        + shadow * float(weights.get("shadow_presence", 0.1))
    )
    return np.nan_to_num(score, nan=0.5).clip(0.0, 1.0).astype(np.float32)


def aggregate_to_grid(
    water_mask,
    vegetation_density_map,
    shadow_mask,
    water_proximity_map,
    stagnant_water_map,
    grid_size=16,
):
    water = _safe_float_map(water_mask)
    vegetation = _safe_float_map(vegetation_density_map)
    shadow = _safe_float_map(shadow_mask)
    water_proximity = _safe_float_map(water_proximity_map)
    stagnant = _safe_float_map(stagnant_water_map)

    h, w = water.shape
    gx = max(1, int(grid_size))
    gy = max(1, int(grid_size))
    cell_w = max(1, int(np.ceil(w / gx)))
    cell_h = max(1, int(np.ceil(h / gy)))

    cells = []
    cell_id = 0
    for yi in range(gy):
        y0 = yi * cell_h
        y1 = min((yi + 1) * cell_h, h)
        if y0 >= h:
            continue
        for xi in range(gx):
            x0 = xi * cell_w
            x1 = min((xi + 1) * cell_w, w)
            if x0 >= w:
                continue

            w_patch = water[y0:y1, x0:x1]
            v_patch = vegetation[y0:y1, x0:x1]
            s_patch = shadow[y0:y1, x0:x1]
            wp_patch = water_proximity[y0:y1, x0:x1]
            st_patch = stagnant[y0:y1, x0:x1]

            cells.append(
                {
                    "cell_id": cell_id,
                    "x": int(x0),
                    "y": int(y0),
                    "width": int(x1 - x0),
                    "height": int(y1 - y0),
                    "features": {
                        "water": float(np.mean(w_patch)) if w_patch.size else 0.5,
                        "vegetation": float(np.mean(v_patch)) if v_patch.size else 0.5,
                        "shadow": float(np.mean(s_patch)) if s_patch.size else 0.5,
                        "water_proximity": float(np.mean(wp_patch)) if wp_patch.size else 0.5,
                        "stagnant_water": float(np.mean(st_patch)) if st_patch.size else 0.5,
                    },
                }
            )
            cell_id += 1
    return cells


def parse_frame_metadata(frame_filename, frame_index, fps=30.0, geo=None):
    base = os.path.splitext(os.path.basename(frame_filename))[0]
    frame_num = frame_index
    if "_" in base:
        tail = base.split("_")[-1]
        if tail.isdigit():
            frame_num = int(tail)

    timestamp = (datetime(1970, 1, 1) + timedelta(seconds=(frame_num / max(fps, 1e-6)))).isoformat() + "Z"
    metadata = {
        "frame_id": os.path.basename(frame_filename),
        "timestamp": timestamp,
    }
    if geo:
        metadata["geo"] = {"lat": float(geo[0]), "lon": float(geo[1])}
    return metadata


def heatmap_overlay(frame_bgr, feature_map):
    feature = _safe_float_map(feature_map)
    feature_u8 = (feature * 255).astype(np.uint8)
    color = cv2.applyColorMap(feature_u8, cv2.COLORMAP_TURBO)
    return cv2.addWeighted(frame_bgr, 0.6, color, 0.4, 0)


class DerivedFeatureEngine:
    def __init__(self, config=None):
        cfg = dict(DEFAULT_CONFIG)
        if config:
            cfg.update({k: v for k, v in config.items() if k != "weights"})
            if "weights" in config and isinstance(config["weights"], dict):
                merged = dict(DEFAULT_CONFIG["weights"])
                merged.update(config["weights"])
                cfg["weights"] = merged
        self.config = cfg

    def compute(self, frame_bgr, water_mask, vegetation_mask, shadow_mask):
        water_proximity = compute_water_proximity(water_mask)
        vegetation_density = compute_vegetation_density(
            vegetation_mask,
            blur_kernel=int(self.config.get("vegetation_blur_kernel", 21)),
        )
        low_motion = _compute_low_motion_proxy(frame_bgr)
        stagnant = compute_stagnant_water(
            water_mask,
            vegetation_density,
            shadow_mask,
            low_motion,
            self.config.get("weights", DEFAULT_CONFIG["weights"]),
        )

        return {
            "water_proximity_map": water_proximity,
            "vegetation_density_map": vegetation_density,
            "stagnant_water_likelihood_map": stagnant,
            "low_motion_proxy_map": low_motion,
        }
