#!/usr/bin/env python3
"""Convert a dense class-colored map into a block-style class-colored image."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageFilter


HSVRange = Tuple[Tuple[int, int], Tuple[int, int], Tuple[int, int]]


@dataclass(frozen=True)
class ClassSpec:
    name: str
    hsv_range: HSVRange
    color_rgb: Tuple[int, int, int]
    wrap_hue: bool = False


@dataclass(frozen=True)
class BlockMapResult:
    output_rgb: np.ndarray
    block_map_rgb: np.ndarray
    winner_index: np.ndarray
    winner_score: np.ndarray


DEFAULT_CLASSES: List[ClassSpec] = [
    ClassSpec(
        name="green",
        hsv_range=((55, 120), (40, 255), (30, 255)),
        color_rgb=(111, 230, 76),
    ),
    ClassSpec(
        name="blue",
        hsv_range=((145, 210), (45, 255), (20, 255)),
        color_rgb=(70, 70, 235),
    ),
    ClassSpec(
        name="grey",
        hsv_range=((0, 255), (0, 55), (15, 210)),
        color_rgb=(70, 70, 70),
    ),
]


PathLike = Union[str, Path]


def ensure_parent_dir(path: Path) -> None:
    if path.parent != Path():
        path.parent.mkdir(parents=True, exist_ok=True)


def read_image(path: Path) -> np.ndarray:
    if not path.exists():
        raise FileNotFoundError(f"Could not read image: {path}")
    with Image.open(path) as image:
        return np.asarray(image.convert("RGB"), dtype=np.uint8)


def save_image(path: Path, rgb_image: np.ndarray) -> None:
    ensure_parent_dir(path)
    Image.fromarray(rgb_image, mode="RGB").save(path)


def resize_image(rgb_image: np.ndarray, size: Tuple[int, int], nearest: bool) -> np.ndarray:
    resample = Image.Resampling.NEAREST if nearest else Image.Resampling.BILINEAR
    return np.asarray(
        Image.fromarray(rgb_image, mode="RGB").resize(size, resample),
        dtype=np.uint8,
    )


def build_mask(image_hsv: np.ndarray, spec: ClassSpec) -> np.ndarray:
    h = image_hsv[..., 0]
    s = image_hsv[..., 1]
    v = image_hsv[..., 2]
    (h_low, h_high), (s_low, s_high), (v_low, v_high) = spec.hsv_range

    if spec.wrap_hue:
        hue_mask = (h >= h_low) | (h <= h_high)
    else:
        hue_mask = (h >= h_low) & (h <= h_high)

    mask = (
        hue_mask
        & (s >= s_low)
        & (s <= s_high)
        & (v >= v_low)
        & (v <= v_high)
    )
    return mask.astype(np.uint8) * 255


def clean_mask(mask: np.ndarray, kernel_size: int) -> np.ndarray:
    if kernel_size <= 1:
        return mask

    if kernel_size % 2 == 0:
        kernel_size += 1

    mask_image = Image.fromarray(mask, mode="L")
    opened = mask_image.filter(ImageFilter.MinFilter(kernel_size)).filter(
        ImageFilter.MaxFilter(kernel_size)
    )
    closed = opened.filter(ImageFilter.MaxFilter(kernel_size)).filter(
        ImageFilter.MinFilter(kernel_size)
    )
    return np.asarray(closed, dtype=np.uint8)


def class_masks(image_rgb: np.ndarray, kernel_size: int) -> np.ndarray:
    hsv = np.asarray(Image.fromarray(image_rgb, mode="RGB").convert("HSV"), dtype=np.uint8)
    masks = []
    for spec in DEFAULT_CLASSES:
        mask = build_mask(hsv, spec)
        mask = clean_mask(mask, kernel_size)
        masks.append(mask.astype(np.float32) / 255.0)
    return np.stack(masks, axis=0)


def aggregate_class_scores(masks: np.ndarray, grid_size: int) -> np.ndarray:
    if grid_size <= 0:
        raise ValueError("grid_size must be a positive integer.")

    _, height, width = masks.shape
    scores = np.zeros((masks.shape[0], grid_size, grid_size), dtype=np.float32)

    for row in range(grid_size):
        y0 = int(round(row * height / grid_size))
        y1 = int(round((row + 1) * height / grid_size))
        for col in range(grid_size):
            x0 = int(round(col * width / grid_size))
            x1 = int(round((col + 1) * width / grid_size))
            cell = masks[:, y0:y1, x0:x1]
            if cell.size:
                scores[:, row, col] = cell.mean(axis=(1, 2))

    return scores


def fallback_index(class_name: str) -> int:
    lookup = {spec.name: idx for idx, spec in enumerate(DEFAULT_CLASSES)}
    if class_name not in lookup:
        names = ", ".join(spec.name for spec in DEFAULT_CLASSES)
        raise ValueError(f"Unknown fallback class '{class_name}'. Valid values: {names}")
    return lookup[class_name]


def render_block_map(
    scores: np.ndarray,
    grid_size: int,
    output_size: Tuple[int, int],
    min_coverage: float,
    fallback_class_name: str,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    winner_index = scores.argmax(axis=0)
    winner_score = scores.max(axis=0)
    fallback = fallback_index(fallback_class_name)
    winner_index = np.where(winner_score >= min_coverage, winner_index, fallback)

    block_small = np.zeros((grid_size, grid_size, 3), dtype=np.uint8)
    for idx, spec in enumerate(DEFAULT_CLASSES):
        block_small[winner_index == idx] = np.array(spec.color_rgb, dtype=np.uint8)

    block_big = resize_image(block_small, output_size, nearest=True)
    return block_big, winner_index, winner_score


def blend_on_base(block_map: np.ndarray, base_rgb: np.ndarray, alpha: float) -> np.ndarray:
    mixed = base_rgb.astype(np.float32) * (1.0 - alpha) + block_map.astype(np.float32) * alpha
    return np.clip(mixed, 0.0, 255.0).astype(np.uint8)


def generate_block_map_from_array(
    dense_image_rgb: np.ndarray,
    base_image_rgb: Optional[np.ndarray] = None,
    *,
    grid_size: int = 8,
    alpha: float = 0.55,
    min_coverage: float = 0.0,
    fallback_class: str = "grey",
    morph_kernel: int = 3,
) -> BlockMapResult:
    """Convert a dense class-colored image array into block-colored output."""
    masks = class_masks(dense_image_rgb, morph_kernel)
    scores = aggregate_class_scores(masks, grid_size)
    output_size = (dense_image_rgb.shape[1], dense_image_rgb.shape[0])
    block_map, winner_index, winner_score = render_block_map(
        scores=scores,
        grid_size=grid_size,
        output_size=output_size,
        min_coverage=max(0.0, min(float(min_coverage), 1.0)),
        fallback_class_name=fallback_class.lower(),
    )

    if base_image_rgb is not None:
        if base_image_rgb.shape[:2] != dense_image_rgb.shape[:2]:
            base_image_rgb = resize_image(base_image_rgb, output_size, nearest=False)
        output_rgb = blend_on_base(
            block_map,
            base_image_rgb,
            max(0.0, min(float(alpha), 1.0)),
        )
    else:
        output_rgb = block_map

    return BlockMapResult(
        output_rgb=output_rgb,
        block_map_rgb=block_map,
        winner_index=winner_index,
        winner_score=winner_score,
    )


def convert_pixel_heatmap(
    input_file: PathLike,
    output_file: Optional[PathLike] = None,
    *,
    base_image_filename: Optional[PathLike] = None,
    grid_size: int = 8,
    alpha: float = 0.55,
    min_coverage: float = 0.0,
    fallback_class: str = "grey",
    morph_kernel: int = 3,
) -> BlockMapResult:
    """
    Convert a heatmap image file into block-colored output.

    This is the method intended for integration into other codebases.
    Pass the input file and optionally an output file to save the result.
    """
    input_path = Path(input_file)
    dense_image = read_image(input_path)
    base_image = read_image(Path(base_image_filename)) if base_image_filename else None
    result = generate_block_map_from_array(
        dense_image,
        base_image,
        grid_size=grid_size,
        alpha=alpha,
        min_coverage=min_coverage,
        fallback_class=fallback_class,
        morph_kernel=morph_kernel,
    )

    if output_file is not None:
        save_image(Path(output_file), result.output_rgb)

    return result
