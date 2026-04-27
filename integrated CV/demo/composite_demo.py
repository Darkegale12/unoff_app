import cv2
import numpy as np
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from pipeline.spatial_mapper import SpatialMapper

def create_composite(frame_paths, output_size=(1024, 1024)):
    h, w = output_size[1] // 2, output_size[0] // 2
    frames = []
    labels = ["Water", "Vegetation", "Container", "Shadow"]
    for i in range(4):
        if i < len(frame_paths) and os.path.exists(frame_paths[i]):
            f = cv2.resize(cv2.imread(frame_paths[i]), (w, h))
        else:
            f = np.zeros((h, w, 3), dtype=np.uint8)
            cv2.rectangle(f, (0,0), (w,h), (50, 50, 50), -1)
            cv2.putText(f, f"Quadrant {i+1}: {labels[i]}", (10, h//2), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(f, labels[i], (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        frames.append(f)
    return np.vstack((np.hstack((frames[0], frames[1])), np.hstack((frames[2], frames[3]))))

def run_demo(frame_paths, output_path):
    print("Generating Composite Demo...")
    composite = create_composite(frame_paths)
    mapper = SpatialMapper(grid_size=(16, 16))
    heatmap = mapper.apply_heatmap(composite, mapper.generate_risk_map(composite))
    for i, label in enumerate(["Water Zone", "Veg Zone", "Cont Zone", "Shadow Zone"]):
        r, c = i // 2, i % 2
        y, x = (r+1) * (composite.shape[0]//2) - 20, c * (composite.shape[1]//2) + 10
        cv2.putText(heatmap, label, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imwrite(output_path, heatmap)
    print(f"Composite demo saved to {output_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", nargs="+")
    parser.add_argument("--output", required=True)
    run_demo(args.frames if args.frames else [], args.output)
