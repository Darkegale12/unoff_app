# Implementation Plan (Current)

This document reflects the current implemented pipeline behavior in `CV/main.py` and `CV/pipeline/*`.

## Scope
- Extract sampled frames from a drone video
- Detect frame-level environmental signals (`water`, `vegetation`, `shadow`)
- Generate visual outputs (annotated frames + pixel heatmaps + block heatmaps)
- Compute and export derived feature layers
- Evaluate with ROC/AUC for every input video

## Implemented Architecture

### 1) Ingestion and Setup
- Input CLI arguments:
  - `--video`: input video path
  - `--step`: frame sampling step (default `30`)
- Working directories are initialized under:
  - `data/frames`
  - `data/ground_truth`
  - `outputs/*`
- Per-run cleanup removes stale artifacts for the target video run.

### 2) Frame Extraction
- `pipeline/frame_extractor.py::extract_frames(video_path, out_dir, step)`
- Saves files as `frame_0000.jpg`, `frame_0001.jpg`, ...

### 3) Feature Detection and Output Generation
- `pipeline/feature_runner.py::run_feature_pipeline(...)`
- Per frame:
  - `detect_water(img)` -> `(score, mask)`
  - `detect_vegetation(img)` -> `(score, mask)`
  - `detect_shadow(img)` -> `(score, mask)`
  - `get_detections(img, conf=0.25)` for YOLO visual labeling
- Writes:
  - `outputs/scores.csv`
  - `outputs/visuals/*.jpg`
  - `outputs/heatmap/*.jpg`
  - `outputs/block-heatmaps/*.jpg` (converted from pixel heatmaps)

### 4) Derived Features and Spatial Exports
- `pipeline/derived_features.py`
- Computes:
  - water proximity map
  - vegetation density map
  - stagnant-water likelihood map
- Uses config from `config/derived_features.yaml`:
  - `grid_size`
  - `vegetation_blur_kernel`
  - `weights.*`
- Exports:
  - grid-cell JSON to `outputs/grid_features/`
  - GeoJSON to `outputs/geojson/`

### 5) Evaluation
- `pipeline/roc_evaluator.py::evaluate_pipeline_performance(scores_csv, gt_csv, output_dir)`
- Uses `data/ground_truth/<video_name>_gt.csv` when available
- If GT is missing, pseudo-ground-truth is generated from per-frame scores
- Saves:
  - `outputs/roc_curves/combined_roc_panel.png`
  - `outputs/roc_curves/roc_summary.csv`

## Execution Command
```bash
python main.py --video data/raw_videos/sample.mp4 --step 30
```

## Validation Checklist
- Confirm extracted frames in `data/frames/<video_name>/`
- Confirm score CSV exists at `outputs/scores.csv`
- Confirm image outputs in:
  - `outputs/visuals/`
  - `outputs/heatmap/`
  - `outputs/block-heatmaps/`
- Confirm spatial exports in:
  - `outputs/grid_features/`
  - `outputs/geojson/`
- Confirm ROC outputs in `outputs/roc_curves/` for every run

## Dry-Run Verification Snapshot
- Command:
  - `python main.py --video data/raw_videos/sample.mp4 --step 30`
- Execution result:
  - 5 sampled frames extracted to `data/frames/sample/`
  - 5 outputs each in `visuals`, `heatmap`, `block-heatmaps`, `grid_features`, and `geojson`
  - `outputs/scores.csv` generated with 5 frame rows
  - `outputs/roc_curves/combined_roc_panel.png` and `outputs/roc_curves/roc_summary.csv` generated
