import io
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract

from app.core.config import settings
from app.schemas.ocr_schema import OcrProcessResponse, OcrPageResult, HealthResponse
from app.services.pdf.pdf_service import PdfService
from app.services.preprocessing.image_processor import ImageProcessor
from app.services.engines.ocr_engine import TesseractEngine, ModularHandwritingEngine

app = FastAPI(
    title="Swasthya Copilot OCR Service",
    description="Multilingual Medical Document Intelligence and OCR Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tesseract_engine = TesseractEngine()
handwriting_engine = ModularHandwritingEngine()

@app.get("/")
def root_status():
    return {
        "service": "Swasthya Copilot OCR Service",
        "status": "online",
        "health": "/health",
    }

@app.get("/health", response_model=HealthResponse)
def health_check():
    try:
        langs = pytesseract.get_languages()
        tess_ok = True
    except Exception:
        langs = []
        tess_ok = False

    return HealthResponse(
        status="healthy" if tess_ok else "degraded",
        version="1.0.0",
        tesseract_available=tess_ok,
        installed_languages=langs,
    )

@app.post("/ocr/process", response_model=OcrProcessResponse)
async def process_document(
    file: UploadFile = File(...),
    languages: Optional[str] = Form(None),
    detect_handwriting: bool = Form(False),
    document_id: Optional[str] = Form(None),
):
    start_time = time.time()
    langs_to_use = languages or settings.DEFAULT_LANGS

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    content_type = file.content_type or ""
    filename = (file.filename or "").lower()

    is_pdf = content_type == "application/pdf" or filename.endswith(".pdf") or content[:4] == b"%PDF"
    pages_results = []
    engine_name = "tesseract"
    version_str = tesseract_engine.version

    try:
        if is_pdf:
            # Handle PDF document
            extracted_pages = PdfService.extract_pages(content, max_pages=20)
            
            for page_num, embedded_text, rendered_image in extracted_pages:
                # If digital embedded text is rich (>80 chars), use it directly or supplement with OCR
                if len(embedded_text) > 80:
                    pages_results.append(
                        OcrPageResult(
                            page_number=page_num,
                            text=embedded_text,
                            confidence=99.0,
                            engine="pdf_digital_layer",
                            language="mixed",
                            warnings=[],
                            blocks=[],
                        )
                    )
                else:
                    # Scanned or low digital text PDF page -> Preprocess & OCR
                    preprocessed = ImageProcessor.preprocess_for_ocr(rendered_image)
                    engine = handwriting_engine if detect_handwriting else tesseract_engine
                    res = engine.process_image(preprocessed, page_num, langs_to_use)
                    # If embedded text had partial words, prepend
                    if embedded_text:
                        res.text = f"{embedded_text}\n{res.text}".strip()
                    pages_results.append(res)
        else:
            # Handle Single Image (PNG / JPEG)
            try:
                raw_image = Image.open(io.BytesIO(content))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

            preprocessed = ImageProcessor.preprocess_for_ocr(raw_image)
            engine = handwriting_engine if detect_handwriting else tesseract_engine
            res = engine.process_image(preprocessed, page_number=1, languages=langs_to_use)
            pages_results.append(res)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    total_chars = sum(len(p.text) for p in pages_results)
    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return OcrProcessResponse(
        document_id=document_id,
        page_count=len(pages_results),
        engine=engine_name,
        version=version_str,
        pages=pages_results,
        total_characters=total_chars,
        processing_time_ms=elapsed_ms,
        status="success",
        warnings=[],
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
