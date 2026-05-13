import cv2
import numpy as np

def detect_shadow(img):
    """
    Dynamic thresholding for shadow detection based on image brightness.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Dynamic threshold: significantly darker than the average frame brightness
    thresh = np.mean(gray) * 0.6
    mask = (gray < thresh).astype(np.uint8)
    
    # Return score and mask (uint8)
    shadow_score = float(np.mean(mask))
    return shadow_score, (mask * 255).astype(np.uint8)

if __name__ == "__main__":
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    dummy[:50, :50] = 10  # Very dark area
    dummy[50:, 50:] = 200 # Bright area
    print(f"Shadow Score: {detect_shadow(dummy)}")
