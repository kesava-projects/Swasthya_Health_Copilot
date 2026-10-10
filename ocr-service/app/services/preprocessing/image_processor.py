import numpy as np
import cv2
from PIL import Image, ImageOps

class ImageProcessor:
    @staticmethod
    def preprocess_for_ocr(image: Image.Image, auto_contrast: bool = True) -> Image.Image:
        """
        High-precision document image enhancement for Medical OCR:
        1. Corrects EXIF orientation.
        2. Converts to OpenCV grayscale representation.
        3. Corrects skew/rotation using bounding text contours.
        4. Upscales low-resolution scans (ensuring character height >= 32px for Tesseract).
        5. Applies Bilateral Filtering to suppress scanner noise while preserving crisp character edges.
        6. Enhances local contrast via CLAHE (eliminates shadows, creases, and uneven illumination).
        7. Applies Otsu's optimal binarization.
        8. Adds safety white border padding to prevent edge text truncation.
        """
        # 1. Correct EXIF orientation
        image = ImageOps.exif_transpose(image)

        # Convert PIL to OpenCV array
        if image.mode != "RGB":
            image = image.convert("RGB")
        cv_img = np.array(image)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_RGB2GRAY)

        # 2. Deskew image if tilted
        gray = ImageProcessor.estimate_skew_and_rotate_cv(gray)

        # 3. Dynamic Resolution Optimization / Upscaling
        # Tesseract performs best when text x-height is ~30-40 pixels. Low DPI images severely degrade accuracy.
        h, w = gray.shape[:2]
        if w < 1800 or h < 1800:
            scale_factor = min(3.0, max(1.5, 2000.0 / max(w, h)))
            new_w = int(w * scale_factor)
            new_h = int(h * scale_factor)
            gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        # 4. Bilateral Denoising: smooths non-text paper texture while preserving sharp font edges
        denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

        # 5. Contrast-Limited Adaptive Histogram Equalization (CLAHE)
        # Prevents faded doctor stamps or low contrast print from vanishing
        if auto_contrast:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            contrast_boosted = clahe.apply(denoised)
        else:
            contrast_boosted = denoised

        # 6. Adaptive / Otsu Binarization
        _, binarized = cv2.threshold(
            contrast_boosted, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )

        # 7. Add border padding (Tesseract can miss text placed directly on edges)
        padded = cv2.copyMakeBorder(
            binarized, 36, 36, 36, 36, cv2.BORDER_CONSTANT, value=255
        )

        return Image.fromarray(padded)

    @staticmethod
    def estimate_skew_and_rotate_cv(gray_cv: np.ndarray) -> np.ndarray:
        """
        Calculates skew angle of text blocks using OpenCV minimum-area bounding box
        and rotates the document to be level.
        """
        try:
            # Threshold to isolate dark text on light background
            _, thresh = cv2.threshold(gray_cv, 200, 255, cv2.THRESH_BINARY_INV)
            coords = np.column_stack(np.where(thresh > 0))
            if len(coords) < 100:
                return gray_cv

            rect = cv2.minAreaRect(coords)
            angle = rect[-1]

            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle

            # Only correct if skew is between 0.5 and 20 degrees
            if 0.5 <= abs(angle) <= 20.0:
                h, w = gray_cv.shape[:2]
                center = (w // 2, h // 2)
                m = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(
                    gray_cv, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
                )
                return rotated
        except Exception:
            pass
        return gray_cv

    @staticmethod
    def estimate_skew_and_rotate(image: Image.Image) -> Image.Image:
        """
        Public PIL-compatible rotation method.
        """
        arr = np.array(image.convert("L"))
        rotated = ImageProcessor.estimate_skew_and_rotate_cv(arr)
        return Image.fromarray(rotated)
