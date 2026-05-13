import os
from ultralytics import YOLO

# Shared YOLOv8 model instance to avoid reloading
_model = None

def get_yolo_model():
    global _model
    if _model is None:
        # Load the pre-trained YOLOv8 model
        # 'n' for nano is very fast for real-time drone processing
        _model = YOLO('yolov8n.pt')
    return _model

def get_detections(img, conf=0.5):
    model = get_yolo_model()
    results = model(img, conf=conf, verbose=False)
    return results[0]
