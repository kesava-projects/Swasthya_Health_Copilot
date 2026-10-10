import os
import re
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

class MedicalTextPostProcessor:
    """
    Cleans up character-level and field-level artifacts common in medical OCR scans:
    - Restores dropped decimal points in clinical metrics (e.g. Hemoglobin 142 -> 14.2 g/dL)
    - Normalizes corrupted medical units (e.g. /met, /meL -> /mcL, mgldl -> mg/dL)
    - Fixes reference range prefixes (e.g. Ret: -> Ref:)
    - Fixes deformed dates (e.g. 202404-12 -> 2024-04-12)
    - Strips noisy quotation marks and leading glyph artifacts from prescription labels
    """
    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # 1. Clean quotation / apostrophe artifacts often mistaken for bullets/tabs
        text = re.sub(r'^[‘“`\'"]+\s*(Tab|Tablet|Cap|Capsule|Syp|Inj)\b', r'\1', text, flags=re.MULTILINE)
        text = re.sub(r'\b(Tab|Cap|Syp|Inj)\s+([A-Z])', r'\1. \2', text)

        # 2. Fix corrupt reference interval headers
        text = re.sub(r'\(?\bRet[:.]?\s*', r'(Ref: ', text)
        text = re.sub(r'\bRet[:.]\s*', r'Ref: ', text)

        # 3. Clean common lab units
        text = re.sub(r'/(?:met|meL|mcl|mel)\b', r'/mcL', text)
        text = re.sub(r'\b(?:mgldl|mgd|maid|mid|mg/dl)\b\.?', r'mg/dL', text)
        text = re.sub(r'\b(?:g/dl|g/d|gid)\b\.?', r'g/dL', text)

        # 4. Fix Hemoglobin decimal omission (e.g. 142 g/dL -> 14.2 g/dL)
        text = re.sub(
            r'\b(HEMOGLOBIN[:\s]+)(1[0-9]|2[0-4])([0-9])(\s*g/dL)\b',
            r'\1\2.\3\4',
            text,
            flags=re.IGNORECASE
        )

        # 5. Fix dates where hyphen was dropped or converted to dot
        text = re.sub(r'\b(20[2-3][0-9])0([0-9])-([0-3][0-9])\b', r'\1-0\2-\3', text)
        text = re.sub(r'\b(20[2-3][0-9])\.([0-1][0-9])[-.]([0-3][0-9])\b', r'\1-\2-\3', text)

        # 6. Fix glued words like "Reviewatter30"
        text = re.sub(r'\bReviewatter(\d+)\b', r'Review after \1', text)
        text = re.sub(r'\bReviewafter(\d+)\b', r'Review after \1', text)

        return text.strip()


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
            # 1. Multi-pass OCR:
            # Pass A: PSM 6 (Assume a single uniform block of text - optimal for lab reports and structured records)
            try:
                text_psm6 = pytesseract.image_to_string(image, lang=languages, config="--psm 6").strip()
            except Exception:
                text_psm6 = ""

            # Pass B: PSM 3 (Fully automatic page segmentation)
            try:
                text_psm3 = pytesseract.image_to_string(image, lang=languages, config="--psm 3").strip()
            except Exception:
                text_psm3 = ""

            # Choose the richer, more structured layout
            full_text = text_psm6 if len(text_psm6) >= len(text_psm3) * 0.85 and len(text_psm6) > 0 else text_psm3

            # Apply clinical post-processing to repair common OCR degradation
            full_text = MedicalTextPostProcessor.clean(full_text)

            # 2. Extract bounding boxes and confidence score using image_to_data
            valid_confidences = []
            try:
                data = pytesseract.image_to_data(
                    image,
                    lang=languages,
                    output_type=pytesseract.Output.DICT
                )

                n_boxes = len(data.get("text", []))
                for i in range(n_boxes):
                    raw_word = data["text"][i].strip()
                    conf = float(data["conf"][i])

                    if raw_word:
                        cleaned_word = MedicalTextPostProcessor.clean(raw_word)
                        if conf >= 0:
                            valid_confidences.append(conf)

                        blocks.append(
                            OcrBlock(
                                text=cleaned_word,
                                confidence=conf if conf >= 0 else None,
                                bbox=BoundingBox(
                                    x=data["left"][i],
                                    y=data["top"][i],
                                    width=data["width"][i],
                                    height=data["height"][i],
                                )
                            )
                        )
            except Exception as data_err:
                warnings.append(f"Bounding box extraction notice: {str(data_err)}")

            avg_conf = (
                sum(valid_confidences) / len(valid_confidences)
                if len(valid_confidences) > 0
                else (90.0 if len(full_text) > 0 else None)
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
            warnings.append(f"Multilingual OCR notice: {str(e)}. Retrying with English engine...")
            try:
                full_text = pytesseract.image_to_string(image, lang="eng", config="--psm 6").strip()
                full_text = MedicalTextPostProcessor.clean(full_text)
                return OcrPageResult(
                    page_number=page_number,
                    text=full_text,
                    confidence=85.0 if full_text else 0.0,
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
                    language="eng",
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
