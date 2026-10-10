from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import io
import pytest
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "tesseract_available" in data
    assert isinstance(data["installed_languages"], list)

def test_process_printed_english_image():
    # Generate synthetic printed image with medical text
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 30), "Hemoglobin: 14.2 g/dL", fill=(0, 0, 0))

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    response = client.post(
        "/ocr/process",
        files={"file": ("test_report.png", img_byte_arr, "image/png")},
        data={"languages": "eng"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["page_count"] == 1
    assert len(data["pages"]) == 1
    extracted_text = data["pages"][0]["text"]
    assert "Hemoglobin" in extracted_text or "14.2" in extracted_text
