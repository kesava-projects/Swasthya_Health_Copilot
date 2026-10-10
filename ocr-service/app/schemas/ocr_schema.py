from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class OcrBlock(BaseModel):
    text: str
    confidence: Optional[float] = None
    bbox: Optional[BoundingBox] = None

class OcrPageResult(BaseModel):
    page_number: int
    text: str
    confidence: Optional[float] = None
    engine: str = "tesseract"
    language: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    blocks: List[OcrBlock] = Field(default_factory=list)

class OcrProcessResponse(BaseModel):
    document_id: Optional[str] = None
    page_count: int
    engine: str
    version: str
    pages: List[OcrPageResult]
    total_characters: int
    processing_time_ms: float
    status: str = "success"
    warnings: List[str] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: str
    version: str
    tesseract_available: bool
    installed_languages: List[str]
