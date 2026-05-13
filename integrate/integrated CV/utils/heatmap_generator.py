import cv2
import numpy as np

def apply_combined_heatmap(image, water_mask, veg_mask, shadow_mask, alpha=0.5):
    """
    Creates a combined heatmap overlay on the original image.
    Colors (BGR):
    - Vegetation: Green (0, 255, 0)
    - Water: Blue (255, 0, 0)
    - Shadow: Dark Gray (50, 50, 50)
    """
    heatmap = np.zeros_like(image)
    
    # Create colored layers
    # Vegetation (Green)
    heatmap[veg_mask > 0] = [0, 255, 0]
    
    # Water (Blue) - Overlay water on top of vegetation if overlap (unlikely but possible)
    heatmap[water_mask > 0] = [255, 0, 0]
    
    # Shadow (Dark Gray)
    heatmap[shadow_mask > 0] = [50, 50, 50]
    
    # Blend with original image
    combined = cv2.addWeighted(image, 1.0, heatmap, alpha, 0)
    
    return combined
