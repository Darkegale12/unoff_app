# Execution Guide (Current)

This guide describes how to run and verify the pipeline as it exists now.

## Prerequisites
- Python environment with dependencies installed
- Input video available in `data/raw_videos/`

Install dependencies:
```bash
pip install opencv-python numpy matplotlib scikit-learn pandas scipy Pillow tabulate pyyaml
```

## Run Command
```bash
python main.py --video data/raw_videos/sample.mp4 --step 30
```

## What the Run Performs
1. Cleans previous outputs for the selected run
2. Extracts sampled frames to `data/frames/<video_name>/`
3. Computes `water`, `vegetation`, and `shadow` score/mask per frame
4. Saves:
   - `outputs/scores.csv`
   - `outputs/visuals/*.jpg`
   - `outputs/heatmap/*.jpg`
   - `outputs/block-heatmaps/*.jpg`
5. Computes derived features and exports:
   - `outputs/grid_features/*.json`
   - `outputs/geojson/*.geojson`
6. Runs ROC/AUC evaluation for every input video:
   - `outputs/roc_curves/combined_roc_panel.png`
   - `outputs/roc_curves/roc_summary.csv`
   - If `data/ground_truth/<video_name>_gt.csv` is missing, pseudo-ground-truth is generated automatically before evaluation.

## Ground Truth Format
Expected path:
`data/ground_truth/<video_name>_gt.csv`

Required columns:
- `frame`
- `water_gt`
- `vegetation_gt`
- `shadow_gt`

If the file is not present, the pipeline creates pseudo-ground-truth from score distributions so ROC/AUC outputs are still produced.

## Verification Checklist
- `data/frames/<video_name>/` is populated
- `outputs/scores.csv` exists and has frame-wise rows
- Visual outputs are generated in `outputs/visuals/` and `outputs/heatmap/`
- Block heatmaps are generated in `outputs/block-heatmaps/`
- Derived exports are present in `outputs/grid_features/` and `outputs/geojson/`
- ROC outputs are present in `outputs/roc_curves/` for every run

## Dry Run Evidence (Latest)
Command executed:
```bash
python main.py --video data/raw_videos/sample.mp4 --step 30
```

Observed:
- Extracted 5 sampled frames in `data/frames/sample/`
- Generated 5 files each in:
  - `outputs/visuals/`
  - `outputs/heatmap/`
  - `outputs/block-heatmaps/`
  - `outputs/grid_features/`
  - `outputs/geojson/`
- Wrote `outputs/scores.csv` with 5 frame rows
- Wrote ROC artifacts:
  - `outputs/roc_curves/combined_roc_panel.png`
  - `outputs/roc_curves/roc_summary.csv`
