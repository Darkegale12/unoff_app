import cv2
import numpy as np
import os

def generate_synthetic_video(output_path, duration=3, fps=10):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 640, 480
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    for i in range(duration * fps):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Water (Blue) - only in first half
        if i < (duration * fps // 2):
            cv2.rectangle(frame, (0, 0), (width//2, height//2), (150, 100, 50), -1)
        
        # Vegetation (Green) - only in second half
        if i >= (duration * fps // 2):
            cv2.rectangle(frame, (width//2, 0), (width, height//2), (50, 200, 50), -1)
            
        # Container (Circle) - only in middle
        if (duration * fps // 4) < i < (3 * duration * fps // 4):
            cv2.circle(frame, (width//4, height*3//4), 30, (200, 200, 200), -1)
            
        # Shadow (Dark) - alternating
        if (i // 5) % 2 == 0:
            cv2.rectangle(frame, (width//2, height//2), (width, height), (20, 20, 20), -1)
            
        out.write(frame)
    out.release()
    print(f"Synthetic video generated at {output_path}")

if __name__ == "__main__":
    generate_synthetic_video("data/raw_videos/test_video.mp4")
