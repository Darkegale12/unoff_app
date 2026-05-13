import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc
import os

def evaluate_pipeline_performance(scores_csv, gt_csv, output_dir):
    """
    Computes ROC and AUC for each feature based on consolidated CSVs.
    """
    if not os.path.exists(scores_csv) or not os.path.exists(gt_csv):
        print("Error: Scores or Ground Truth CSV missing.")
        return

    scores_df = pd.read_csv(scores_csv)
    gt_df = pd.read_csv(gt_csv)
    
    # Merge on 'frame'
    data = pd.merge(gt_df, scores_df, on="frame")
    
    os.makedirs(output_dir, exist_ok=True)
    features = ["water", "vegetation", "shadow"]
    
    plt.figure(figsize=(10, 8))
    
    results = []
    
    for feature in features:
        gt_col = f"{feature}_gt"
        if gt_col not in data.columns:
            continue
            
        y_true = data[gt_col].values
        y_scores = data[feature].values
        
        # Ensure we have both classes
        if len(np.unique(y_true)) < 2:
            print(f"Skipping {feature}: Only one class found in ground truth.")
            continue
            
        fpr, tpr, _ = roc_curve(y_true, y_scores)
        roc_auc = auc(fpr, tpr)
        
        plt.plot(fpr, tpr, lw=2, label=f"{feature.capitalize()} (AUC = {roc_auc:.2f})")
        results.append({"feature": feature, "auc": roc_auc})

    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curves - Drone CV Pipeline')
    plt.legend(loc="lower right")
    
    plot_path = os.path.join(output_dir, "combined_roc_panel.png")
    plt.savefig(plot_path)
    plt.close()
    
    print(f"ROC curves saved to {plot_path}")
    pd.DataFrame(results).to_csv(os.path.join(output_dir, "roc_summary.csv"), index=False)
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scores", required=True)
    parser.add_argument("--gt", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    evaluate_pipeline_performance(args.scores, args.gt, args.output)
