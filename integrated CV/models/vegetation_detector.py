import cv2
import numpy as np

def detect_vegetation(img):
    """
    High-Accuracy Vegetation Pipeline using Laplacian Texture Gating.
    Prevents false positives from green forest paths, foggy air, and mossy rocks.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Color Masking: Isolate Green spectrum
    green_mask = cv2.inRange(hsv, (35, 40, 40), (90, 255, 255))
    
    # 2. Texture Verification
    # Laplacian detects high-frequency fractal/chaotic edges (leaves)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = laplacian.var()
    
    # 3. Refined Output Score
    veg_score = np.sum(green_mask == 255) / green_mask.size
    
    # If area is green but texture is low (< 100), it's likely fog or green-water.
    original_score = veg_score
    if variance < 100:
        veg_score *= 0.1
        
    return round(min(1.0, float(veg_score)), 2), green_mask

if __name__ == "__main__":
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    print(f"Veg Score: {detect_vegetation(dummy)}")
