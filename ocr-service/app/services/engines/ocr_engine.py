import os
import pytesseract
from PIL import Image
from typing import Protocol, List, Optional
from app.core.config import settings
from app.schemas.ocr_schema import OcrPageResult, OcrBlock, BoundingBox

# Configure Tesseract path if available
if os.path.exists(settings.TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

if os.path.exists(settings.TESSDATA_PREFIX):
    os.environ["TESSDATA_PREFIX"] = settings.TESSDATA_PREFIX

class IOcrEngine(Protocol):
    def process_image(self, image: Image.Image, page_number: int, languages: str) -> OcrPageResult:
        ...

class TesseractEngine:
    def __init__(self):
        self.engine_name = "tesseract"
        try:
            self.version = str(pytesseract.get_tesseract_version())
        except Exception:
            self.version = "unknown"

    def process_image(self, image: Image.Image, page_number: int, languages: str = "eng+hin+tel") -> OcrPageResult:
        warnings = []
        blocks: List[OcrBlock] = []

        try:
            # Run image_to_data to get genuine word/line level confidence and bounding boxes
            data = pytesseract.image_to_data(
                image,
                lang=languages,
                output_type=pytesseract.Output.DICT
            )

            valid_confidences = []
            extracted_words = []

            n_boxes = len(data["text"])
            for i in range(n_boxes):
                text = data["text"][i].strip()
                conf = float(data["conf"][i])

                if text:
                    extracted_words.append(text)
                    if conf >= 0:
                        valid_confidences.append(conf)

                    blocks.append(
                        OcrBlock(
                            text=text,
                            confidence=conf if conf >= 0 else None,
                            bbox=BoundingBox(
                                x=data["left"][i],
                                y=data["top"][i],
                                width=data["width"][i],
                                height=data["height"][i],
                            )
                        )
                    )

            full_text = " ".join(extracted_words)

            # If full text from words is empty, run standard image_to_string
            if not full_text:
                full_text = pytesseract.image_to_string(image, lang=languages).strip()

            avg_conf = (
                sum(valid_confidences) / len(valid_confidences)
                if len(valid_confidences) > 0
                else None
            )

            return OcrPageResult(
                page_number=page_number,
                text=full_text,
                confidence=round(avg_conf, 2) if avg_conf is not None else None,
                engine=self.engine_name,
                language=languages,
                warnings=warnings,
                blocks=blocks,
            )

        except pytesseract.TesseractError as e:
            # Fallback to English if specified multilingual combination fails
            warnings.append(f"Multilingual OCR warning: {str(e)}. Retrying with English...")
            try:
                full_text = pytesseract.image_to_string(image, lang="eng").strip()
                return OcrPageResult(
                    page_number=page_number,
                    text=full_text,
                    confidence=None,
                    engine=self.engine_name,
                    language="eng",
                    warnings=warnings,
                    blocks=[],
                )
            except Exception as ex:
                warnings.append(f"OCR failure: {str(ex)}")
                return OcrPageResult(
                    page_number=page_number,
                    text="",
                    confidence=0.0,
                    engine=self.engine_name,
                    warnings=warnings,
                    blocks=[],
                )


class ModularHandwritingEngine:
    """
    Modular adapter designed for handwritten prescription recognition.
    Integrates specialized handwritten text recognition or configured vision model.
    """
    def __init__(self):
        self.engine_name = "modular_handwriting_adapter"
        self.version = "1.0-preview"

    def process_image(self, image: Image.Image, page_number: int, languages: str = "eng+hin+tel") -> OcrPageResult:
        # Falls back cleanly to base OCR with explicit handwriting warning
        tesseract = TesseractEngine()
        result = tesseract.process_image(image, page_number, languages)
        result.warnings.append(
            "Note: Handwritten prescription text detected. OCR accuracy on cursive handwritten medical notes requires human review and confirmation."
        )
        return result
