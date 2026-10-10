import os

default_tess_path = "/usr/bin/tesseract" if os.path.exists("/usr/bin/tesseract") else "/opt/homebrew/bin/tesseract"
default_tessdata = "/usr/share/tesseract-ocr/5/tessdata" if os.path.exists("/usr/share/tesseract-ocr/5/tessdata") else "/opt/homebrew/share/tessdata"

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    TESSERACT_PATH: str = os.getenv("TESSERACT_PATH", default_tess_path)
    TESSDATA_PREFIX: str = os.getenv("TESSDATA_PREFIX", default_tessdata)
    DEFAULT_LANGS: str = os.getenv("DEFAULT_LANGS", "eng+hin+tel")
    OCR_ENGINE: str = os.getenv("OCR_ENGINE", "tesseract")
    ENABLE_HANDWRITING_ADAPTER: bool = os.getenv("ENABLE_HANDWRITING_ADAPTER", "false").lower() == "true"

settings = Settings()
