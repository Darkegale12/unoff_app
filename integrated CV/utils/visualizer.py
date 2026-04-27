import cv2

def visualize_scores(frame, scores, yolo_results=None):
    """
    Overlays detection scores and YOLO bounding boxes on the frame.
    Dashboard excludes containers as requested.
    """
    # 1. Start with YOLO bounding boxes if available
    if yolo_results is not None:
        frame = yolo_results.plot(img=frame, conf=True)

    # 2. Add our custom scores dashboard
    if isinstance(scores, dict):
        text_lines = [
            f"Water: {scores.get('water', 0.0):.2f}",
            f"Forest: {scores.get('vegetation', 0.0):.2f}",
            f"Shadow: {scores.get('shadow', 0.0):.2f}"
        ]
    else:
        # Assuming list order: Water, Veg, Shadow
        text_lines = [
            f"Water: {scores[0]:.2f}",
            f"Forest: {scores[1]:.2f}",
            f"Shadow: {scores[2]:.2f}"
        ]

    # Draw semi-transparent background for readability
    overlay = frame.copy()
    cv2.rectangle(overlay, (5, 5), (280, 110), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)

    y_offset = 30
    for line in text_lines:
        cv2.putText(frame, line, (15, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        y_offset += 30

    return frame
