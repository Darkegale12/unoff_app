import pandas as pd
import os
import cv2
import sys
import json

# Ensure models are importable
sys.path.append(os.getcwd())

from models.water_detector import detect_water
from models.shadow_detector import detect_shadow
from models.vegetation_detector import detect_vegetation
from pipeline.heatmap_converter import convert_pixel_heatmap
from utils.yolo_helper import get_detections
from utils.visualizer import visualize_scores
from utils.heatmap_generator import apply_combined_heatmap
from pipeline.derived_features import (
    DerivedFeatureEngine,
    aggregate_to_grid,
    load_derived_config,
    parse_frame_metadata,
)
from utils.geojson_exporter import build_geojson_feature_collection, save_geojson


def run_feature_pipeline(
    frames_dir,
    output_csv,
    vis_dir=None,
    heatmap_dir=None,
    block_heatmap_dir=None,
    geojson_dir=None,
    grid_json_dir=None,
    derived_config_path="config/derived_features.yaml",
):
    """
    Runs all detectors on extracted frames and saves results to CSV.
    Uses Hybrid Traditional (Texture/ExG) and YOLO for environmental features.
    Note: YOLOv8 results are used for bounding box visualization only 
    as Vegetation/Water/Shadows now use more robust Traditional methods.
    """
    if not os.path.exists(frames_dir):
        print(f"Error: Frames directory {frames_dir} not found.")
        return None

    files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])
    print(f"Processing {len(files)} frames with Specialized Biological Detection...")

    results = []
    derived_config = load_derived_config(derived_config_path)
    derived_engine = DerivedFeatureEngine(derived_config)
    
    for idx, file in enumerate(files):
        path = os.path.join(frames_dir, file)
        img = cv2.imread(path)
        if img is None:
            continue

        # 1. Get YOLO detections for visual labels (e.g. tracking landscape elements)
        yolo_results = get_detections(img, conf=0.25)
                
        # --- Specialized Vegetation Detection (Biological Texture + ExG) ---
        v_score, v_mask = detect_vegetation(img)
        
        # --- Water Detection (Robust MVP - Logic Preserved) ---
        w_score, w_mask = detect_water(img)
        
        # --- Shadow Detection ---
        s_score, s_mask = detect_shadow(img)

        # Save scores
        results.append({
            "frame": file,
            "water": w_score,
            "vegetation": v_score,
            "shadow": s_score
        })

        # --- Visualization ---
        if vis_dir:
            os.makedirs(vis_dir, exist_ok=True)
            scores = {
                "water": w_score,
                "vegetation": v_score,
                "shadow": s_score
            }
            annotated_frame = visualize_scores(img, scores, yolo_results=yolo_results)
            cv2.imwrite(os.path.join(vis_dir, file), annotated_frame)
            
        # --- Heatmap Generation ---
        if heatmap_dir:
            os.makedirs(heatmap_dir, exist_ok=True)
            heatmap_img = apply_combined_heatmap(img, w_mask, v_mask, s_mask)
            pixel_heatmap_path = os.path.join(heatmap_dir, file)
            cv2.imwrite(pixel_heatmap_path, heatmap_img)

            if block_heatmap_dir:
                os.makedirs(block_heatmap_dir, exist_ok=True)
                convert_pixel_heatmap(
                    input_file=pixel_heatmap_path,
                    output_file=os.path.join(block_heatmap_dir, file),
                    base_image_filename=path,
                )

        # --- Derived Feature Layer ---
        if geojson_dir or grid_json_dir:
            derived = derived_engine.compute(img, w_mask, v_mask, s_mask)
            water_proximity = derived["water_proximity_map"]
            vegetation_density = derived["vegetation_density_map"]
            stagnant = derived["stagnant_water_likelihood_map"]

            cells = aggregate_to_grid(
                water_mask=w_mask,
                vegetation_density_map=vegetation_density,
                shadow_mask=s_mask,
                water_proximity_map=water_proximity,
                stagnant_water_map=stagnant,
                grid_size=int(derived_config.get("grid_size", 16)),
            )
            frame_meta = parse_frame_metadata(file, frame_index=idx)
            frame_payload = {
                "frame_id": frame_meta["frame_id"],
                "timestamp": frame_meta["timestamp"],
                "cells": cells,
            }

            if grid_json_dir:
                os.makedirs(grid_json_dir, exist_ok=True)
                base = os.path.splitext(file)[0]
                with open(os.path.join(grid_json_dir, f"{base}.json"), "w", encoding="utf-8") as fp:
                    json.dump(frame_payload, fp, indent=2)

            if geojson_dir:
                base = os.path.splitext(file)[0]
                geojson_obj = build_geojson_feature_collection(frame_payload, img.shape)
                save_geojson(geojson_obj, os.path.join(geojson_dir, f"{base}.geojson"))

    # Save scores to CSV
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df = pd.DataFrame(results)
    df.to_csv(output_csv, index=False)
    print(f"Feature scores saved to {output_csv}")
    
    return df
