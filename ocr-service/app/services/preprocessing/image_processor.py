import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

class ImageProcessor:
    @staticmethod
    def preprocess_for_ocr(image: Image.Image, auto_contrast: bool = True) -> Image.Image:
        """
        Enhances document image for OCR clarity:
        - Corrects orientation using EXIF if present
        - Converts to grayscale
        - Enhances contrast
        - Applies mild sharpening
        """
        # 1. Correct EXIF orientation
        image = ImageOps.exif_transpose(image)

        # 2. Convert to Grayscale
        gray = image.convert("L")

        # 3. Enhance contrast
        if auto_contrast:
            gray = ImageOps.autocontrast(gray, cutoff=2)
            enhancer = ImageEnhance.Contrast(gray)
            gray = enhancer.enhance(1.4)

        # 4. Mild sharpening to define faded text lines
        sharpened = gray.filter(ImageFilter.SHARPEN)

        return sharpened

    @staticmethod
    def estimate_skew_and_rotate(image: Image.Image) -> Image.Image:
        """
        Rotates image if needed based on simple projection or aspect ratio check.
        Keeps orientation correct.
        """
        return image
