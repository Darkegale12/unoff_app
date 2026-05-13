# Drone CV Pipeline Summary Report

## Current Pipeline Status
- Feature extraction pipeline is implemented and runnable via `main.py`.
- Active frame-level features: `water`, `vegetation`, `shadow`.
- Derived feature maps are implemented:
  - water proximity
  - vegetation density
  - stagnant-water likelihood

## Output Artifacts
- Frame scores: `outputs/scores.csv`
- Annotated frames: `outputs/visuals/`
- Pixel heatmaps: `outputs/heatmap/`
- Block heatmaps: `outputs/block-heatmaps/`
- Grid-cell JSON exports: `outputs/grid_features/`
- GeoJSON exports: `outputs/geojson/`
- ROC outputs (always generated): `outputs/roc_curves/`

## Evaluation Notes
- ROC/AUC evaluation runs for every input video.
- If `data/ground_truth/<video_name>_gt.csv` is missing, pseudo-ground-truth is generated automatically.
- Expected GT columns:
  - `frame`
  - `water_gt`
  - `vegetation_gt`
  - `shadow_gt`
- If any GT column has a single class only, that feature's ROC is skipped.

## Command Used
```bash
python main.py --video data/raw_videos/sample.mp4 --step 30
```

## Dry-Run Observed Outputs
- Frames extracted: 5 (`data/frames/sample/`)
- `outputs/scores.csv`: 5 rows + header
- `outputs/visuals/`: 5 files
- `outputs/heatmap/`: 5 files
- `outputs/block-heatmaps/`: 5 files
- `outputs/grid_features/`: 5 files
- `outputs/geojson/`: 5 files
- `outputs/roc_curves/`:
  - `combined_roc_panel.png`
  - `roc_summary.csv`

## Notes
- `container` is not part of the current scoring/evaluation pipeline.
- Output folder naming is `outputs/heatmap/` (not `outputs/heatmaps/`).
- `derived_maps` export is intentionally removed; derived features are retained for JSON/GeoJSON generation.
- Block heatmaps are integrated from the `CV_with_blockheatmaps` approach and generated automatically from pixel heatmaps.
