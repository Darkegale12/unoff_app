# Integration Guide: Mosquito Risk Monitoring System

This guide outlines the data structures and files required for the App Team to replicate the "Decision Intelligence Slider" functionality within the production application.

## 1. Core Data Files

| File Path | Frequency | Purpose |
| :--- | :--- | :--- |
| `outputs/daily/day_XXX.json` | Daily (70 files) | Primary map data: 2D grids for Risk, Uncertainty, and Categories. |
| `outputs/weekly/week_XX.json` | Weekly (10 files) | 7-day aggregate data for higher-level trend analysis. |
| `outputs/final_summary.json` | Global (1 file) | Simulation metadata, total impact scores, and the intervention timeline. |
| `map3_daily_weekly_slider.html` | Reference | **Blueprint File**: Contains the Leaflet.js logic, color mapping, and UI handlers. |

## 2. Key Data Schema (`day_XXX.json`)

Each daily JSON file contains the state of the entire city. Key fields to ingest:

### Map Grids (20x20 Arrays)
- **`risk_grid`**: Float values (0.0 to 1.0) representing the estimated mosquito activity.
- **`uncertainty_grid`**: Variance values. Lower is better (higher confidence).
- **`category_grid`**: Integer mapping (0=Low, 1=Medium, 2=High).

### Metadata
- **`phase`**: `"pre"` (Early Phase) or `"post"` (Treatment Phase).
- **`intervention`**: Object containing `triggered` (bool), `reason` (string), and `zones` (list of treated areas).
- **`climate`**: Daily weather parameters (Temp, Rain, Humidity).

## 3. UI/UX Reference Implementation

The App Team should refer to `map3_daily_weekly_slider.html` for the following:

- **Color Palette**:
  - `Low`: `#4393c3` (Blue)
  - `Medium`: `#f4a35a` (Orange)
  - `High`: `#d6312b` (Red)
- **Map Interaction**:
  - The JS `showCellInfo` function demonstrates how to bind click events to the grid to show "Action Taken" (Monitor/Intervene) and "Convergence Score".
  - The `onTimeChange` function shows how to update the entire map state when the user drags a slider.

## 4. Intervention Logic
The system is **Reactive**. The App Team should look for the `intervention_triggered` flag in the daily JSONs. When `true`, it indicates that the system moved from surveillance to active treatment in specific zones.
