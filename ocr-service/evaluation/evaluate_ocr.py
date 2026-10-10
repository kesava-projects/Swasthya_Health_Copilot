#!/usr/bin/env python3
"""
Swasthya Copilot — OCR & Medical Extraction Accuracy Evaluation Suite
Calculates Character Error Rate (CER) and Field-Level Exact Match accuracy:
- Medicine names
- Dosages
- Decimal points
- Dates
- Units
- Reference ranges
"""

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def calculate_cer(reference: str, hypothesis: str) -> float:
    ref_clean = reference.strip()
    hyp_clean = hypothesis.strip()
    if not ref_clean:
        return 0.0 if not hyp_clean else 1.0
    dist = levenshtein_distance(ref_clean, hyp_clean)
    return round(min(1.0, dist / max(len(ref_clean), 1)), 4)

def check_field_match(target_fields, extracted_text):
    if not target_fields:
        return None
    matches = 0
    total = len(target_fields)
    for field in target_fields:
        if field.lower() in extracted_text.lower():
            matches += 1
    return matches / total if total > 0 else 1.0

def render_sample_image(text: str) -> Image.Image:
    # Render synthetic document image with white background and black text
    lines = text.split("\n")
    width = 750
    height = max(200, len(lines) * 45 + 60)
    image = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)
    y = 30
    for line in lines:
        draw.text((30, y), line, fill=(0, 0, 0))
        y += 40
    return image

def run_evaluation():
    # Setup path
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(curr_dir)
    sys.path.insert(0, root_dir)

    from app.services.engines.ocr_engine import TesseractEngine
    from app.services.preprocessing.image_processor import ImageProcessor

    engine = TesseractEngine()
    dataset_file = os.path.join(curr_dir, "dataset.json")

    with open(dataset_file, "r") as f:
        samples = json.load(f)

    print("=" * 70)
    print(" SWASTHYA COPILOT — OCR & FIELD ACCURACY EVALUATION REPORT")
    print("=" * 70)

    total_cer = 0.0
    field_stats = {
        "medicine_name": {"correct": 0, "total": 0},
        "dosage": {"correct": 0, "total": 0},
        "decimal_points": {"correct": 0, "total": 0},
        "dates": {"correct": 0, "total": 0},
        "units": {"correct": 0, "total": 0},
        "reference_ranges": {"correct": 0, "total": 0},
    }

    for sample in samples:
        sample_id = sample["id"]
        gt_text = sample["ground_truth_text"]
        gt_fields = sample["ground_truth_fields"]
        langs = sample["language"]

        # Render and run through OCR
        raw_image = render_sample_image(gt_text)
        preprocessed = ImageProcessor.preprocess_for_ocr(raw_image)
        res = engine.process_image(preprocessed, page_number=1, languages=langs)
        extracted = res.text

        cer = calculate_cer(gt_text, extracted)
        total_cer += cer

        print(f"\n[SAMPLE: {sample_id}] Language: {langs}")
        print(f"  • Character Error Rate (CER): {cer * 100:.2f}%")

        for key, val in gt_fields.items():
            if val:
                for item in val:
                    field_stats[key]["total"] += 1
                    if item.lower() in extracted.lower():
                        field_stats[key]["correct"] += 1

    avg_cer = (total_cer / len(samples)) * 100 if samples else 0.0
    overall_char_accuracy = max(0.0, 100.0 - avg_cer)

    print("\n" + "-" * 70)
    print(" FIELD-LEVEL MEDICAL ACCURACY SCORECARD")
    print("-" * 70)
    for field_name, stats in field_stats.items():
        if stats["total"] > 0:
            acc = (stats["correct"] / stats["total"]) * 100
            print(f"  • {field_name.replace('_', ' ').title():<22}: {stats['correct']}/{stats['total']} ({acc:.1f}%)")
        else:
            print(f"  • {field_name.replace('_', ' ').title():<22}: N/A (Not in sample set)")

    print("-" * 70)
    print(f" OVERALL OCR CHARACTER ACCURACY: {overall_char_accuracy:.2f}% (Average CER: {avg_cer:.2f}%)")
    print("=" * 70)

if __name__ == "__main__":
    run_evaluation()
