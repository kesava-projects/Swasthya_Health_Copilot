import io
from typing import List, Tuple
import pymupdf
from PIL import Image

class PdfService:
    @staticmethod
    def extract_pages(pdf_bytes: bytes, max_pages: int = 20) -> List[Tuple[int, str, Image.Image]]:
        """
        Parses a PDF file and returns a list of:
        (page_number, embedded_text, rendered_page_image)
        """
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_count = min(len(doc), max_pages)
        results = []

        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc[page_idx]

            # 1. Extract digital embedded text
            embedded_text = page.get_text("text").strip()

            # 2. Render page to high-res image (300 DPI for high OCR accuracy)
            pix = page.get_pixmap(dpi=300)
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data)).convert("RGB")

            results.append((page_num, embedded_text, image))

        doc.close()
        return results
