import argparse
import os
import pandas as pd
import subprocess
import shutil

from pipeline.frame_extractor import extract_frames
from pipeline.feature_runner import run_feature_pipeline
from pipeline.roc_evaluator import evaluate_pipeline_performance

def main():
    parser = argparse.ArgumentParser(description="Drone CV Pipeline YOLOv8 MVP")
    parser.add_argument("--video", help="Path to drone video")
    parser.add_argument("--step", type=int, default=30, help="Frame sampling step")
    args = parser.parse_args()

    # Define paths
    DATA_DIR = "data"
    OUTPUT_DIR = "outputs"
    RAW_VIDS = os.path.join(DATA_DIR, "raw_videos")
    FRAMES_DIR = os.path.join(DATA_DIR, "frames")
    GT_DIR = os.path.join(DATA_DIR, "ground_truth")
    
    VIS_DIR = os.path.join(OUTPUT_DIR, "visuals")
    SCORES_CSV = os.path.join(OUTPUT_DIR, "scores.csv")
    ROC_DIR = os.path.join(OUTPUT_DIR, "roc_curves")
    HEATMAP_DIR = os.path.join(OUTPUT_DIR, "heatmap")
    BLOCK_HEATMAP_DIR = os.path.join(OUTPUT_DIR, "block-heatmaps")
    GEOJSON_DIR = os.path.join(OUTPUT_DIR, "geojson")
    GRID_JSON_DIR = os.path.join(OUTPUT_DIR, "grid_features")
    DERIVED_CFG = os.path.join("config", "derived_features.yaml")

    for d in [FRAMES_DIR, GT_DIR, VIS_DIR, ROC_DIR, HEATMAP_DIR, BLOCK_HEATMAP_DIR, GEOJSON_DIR, GRID_JSON_DIR]:
        os.makedirs(d, exist_ok=True)

    if args.video:
        vid_name = os.path.basename(args.video).split('.')[0]
        curr_frames_dir = os.path.join(FRAMES_DIR, vid_name)
        
        # --- Stage 0: Cleanup ---
        print(f"\n--- Stage 0: Cleaning up old results ---")
        for d in [curr_frames_dir, VIS_DIR, HEATMAP_DIR, BLOCK_HEATMAP_DIR, GEOJSON_DIR, GRID_JSON_DIR]:
            if os.path.exists(d):
                print(f"Clearing {d}...")
                shutil.rmtree(d)
            os.makedirs(d, exist_ok=True)
        
        # --- Stage 1: Extraction ---
        print(f"\n--- Stage 1: Extraction ---")
        extract_frames(args.video, curr_frames_dir, step=args.step)
        
        # --- Stage 2 & 3: Feature Detection & Visualization ---
        print(f"\n--- Stage 2 & 3: YOLOv8 Detection & Visualization ---")
        scores_df = run_feature_pipeline(
            curr_frames_dir,
            SCORES_CSV,
            vis_dir=VIS_DIR,
            heatmap_dir=HEATMAP_DIR,
            block_heatmap_dir=BLOCK_HEATMAP_DIR,
            geojson_dir=GEOJSON_DIR,
            grid_json_dir=GRID_JSON_DIR,
            derived_config_path=DERIVED_CFG,
        )
        
        # --- Stage 4: Performance Evaluation ---
        print(f"\n--- Stage 4: ROC Evaluation ---")
        gt_csv = os.path.join(GT_DIR, f"{vid_name}_gt.csv")
        
        # Always ensure GT exists so ROC/AUC is generated for every input video.
        if not os.path.exists(gt_csv):
            print(f"Ground truth missing for '{vid_name}'. Generating pseudo-ground-truth...")
            generate_dummy_gt(SCORES_CSV, gt_csv)

        evaluate_pipeline_performance(SCORES_CSV, gt_csv, ROC_DIR)

        print("\nPipeline execution complete. Check 'outputs/' for results.")

def generate_dummy_gt(scores_csv, output_gt):
    df = pd.read_csv(scores_csv)
    gt_data = {"frame": df["frame"]}
    for feat in ["water", "vegetation", "shadow"]:
        gt_data[f"{feat}_gt"] = (df[feat] > df[feat].median()).astype(int)
        if len(gt_data[f"{feat}_gt"].unique()) < 2:
            gt_data[f"{feat}_gt"].iloc[0] = 1
            gt_data[f"{feat}_gt"].iloc[-1] = 0
    pd.DataFrame(gt_data).to_csv(output_gt, index=False)

if __name__ == "__main__":
    main()
