import cv2
import os

def extract_frames(video_path, out_dir, step=30):
    """
    Extracts frames from a video file at a fixed interval.
    Ensures that different frames are captured by correctly incrementing frame_id.
    """
    if not os.path.exists(video_path):
        print(f"Error: Video file {video_path} not found.")
        return

    os.makedirs(out_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    
    frame_id = 0
    saved = 0

    print(f"Extracting frames from {video_path} to {out_dir} (step={step})...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Save frame only at the specified step interval
        if frame_id % step == 0:
            filename = f"frame_{saved:04d}.jpg"
            path = os.path.join(out_dir, filename)
            cv2.imwrite(path, frame)
            saved += 1

        frame_id += 1

    cap.release()
    print(f"Successfully extracted {saved} frames.")

if __name__ == "__main__":
    # Integration test handled by main.py
    pass
