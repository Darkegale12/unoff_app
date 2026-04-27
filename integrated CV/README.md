# Drone CV Pipeline

Computer vision pipeline for drone footage that:
- extracts sampled frames,
- scores `water`, `vegetation`, and `shadow`,
- generates visual overlays and heatmaps,
- exports grid and GeoJSON derived features,
- and always generates ROC/AUC outputs per video.

## Run Command

```bash
python main.py --video data/raw_videos/your_video.mp4 --step 30
```

Arguments:
- `--video` (required): input video path
- `--step` (optional, default `30`): frame sampling interval

## Pipeline Stages

1. Cleanup previous run artifacts for the selected input video.
2. Extract sampled frames to `data/frames/<video_name>/`.
3. Detect frame-level `water`, `vegetation`, `shadow` and save:
   - `outputs/scores.csv`
   - `outputs/visuals/*.jpg`
   - `outputs/heatmap/*.jpg`
   - `outputs/block-heatmaps/*.jpg`
4. Compute derived feature layers and export:
   - `outputs/grid_features/*.json`
   - `outputs/geojson/*.geojson`
5. Run ROC/AUC evaluation and save:
   - `outputs/roc_curves/combined_roc_panel.png`
   - `outputs/roc_curves/roc_summary.csv`

## Ground Truth Rules

Expected GT file: `data/ground_truth/<video_name>_gt.csv`

Required columns:
- `frame`
- `water_gt`
- `vegetation_gt`
- `shadow_gt`

If the GT file is missing, the pipeline auto-generates pseudo-ground-truth from score distributions so ROC/AUC outputs are still produced.

## Dry Run (Verified)

Executed on:

```bash
python main.py --video data/raw_videos/sample.mp4 --step 30
```

Observed results:
- Frames extracted: `5` (`data/frames/sample/frame_0000.jpg` ... `frame_0004.jpg`)
- `outputs/scores.csv`: `5` rows + header
- `outputs/visuals/`: `5` files
- `outputs/heatmap/`: `5` files
- `outputs/block-heatmaps/`: `5` files
- `outputs/grid_features/`: `5` files
- `outputs/geojson/`: `5` files
- ROC outputs created:
  - `outputs/roc_curves/combined_roc_panel.png`
  - `outputs/roc_curves/roc_summary.csv`

## Notes

- Output counts scale with number of sampled frames.
- `outputs/heatmap/` is the active folder used by the current pipeline.
