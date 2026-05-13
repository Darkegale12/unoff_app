import cv2
import numpy as np

def detect_water(img):
    """
    High-Accuracy Water Detection using Dual-Signal Logic.
    Captures both Clear (Blue) and Silty (Brown) Indian water bodies.
    Includes Specular Highlight (Glint) detection for liquid surfaces.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Dual-Signal Color Masking
    # Coastal/Clear Blue
    blue_mask = cv2.inRange(hsv, (90, 50, 50), (130, 255, 255))
    # Riverine/Silty Brown (Hue 10 to 30)
    brown_mask = cv2.inRange(hsv, (10, 50, 50), (30, 255, 255))
    
    water_mask = cv2.bitwise_or(blue_mask, brown_mask)
    mask_score = np.sum(water_mask == 255) / water_mask.size
    
    # 2. Reflection Capture (Sun Glints)
    # Liquid surfaces produce high-intensity specular highlights
    _, glints = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    glint_factor = np.sum(glints == 255) / glints.size
    
    # combine: glints are a strong multiplier for water presence
    water_score = mask_score + (glint_factor * 10)
    
    return round(min(1.0, float(water_score)), 2), water_mask

if __name__ == "__main__":
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    print(f"Water Score: {detect_water(dummy)}")
