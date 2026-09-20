from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from parser import parse_document

app = FastAPI(title="Agents India Document Reader", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 12 * 1024 * 1024
OCR_ENGINE = None


def get_ocr_engine():
    global OCR_ENGINE
    if OCR_ENGINE is None:
        try:
            from rapidocr import RapidOCR
        except Exception as exc:  # pragma: no cover - environment setup issue
            raise RuntimeError(
                "RapidOCR is not installed. Run setup-reader.bat inside document-reader."
            ) from exc
        OCR_ENGINE = RapidOCR()
    return OCR_ENGINE


def preprocess_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    # Upscale small phone / RC images while avoiding extreme memory use.
    w, h = image.size
    min_side = min(w, h)
    if min_side < 1200:
        scale = min(2.5, 1200 / max(1, min_side))
        image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(1.2)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    return image


def ocr_image(image: Image.Image) -> tuple[str, float | None]:
    image = preprocess_image(image)
    engine = get_ocr_engine()
    result = engine(np.asarray(image))
    txts = list(getattr(result, "txts", None) or [])
    scores = [float(x) for x in (getattr(result, "scores", None) or [])]
    text = "\n".join(str(x).strip() for x in txts if str(x).strip())
    avg = round(sum(scores) / len(scores), 3) if scores else None
    return text, avg


def embedded_pdf_text(data: bytes) -> str:
    with fitz.open(stream=data, filetype="pdf") as doc:
        return "\n\f\n".join(page.get_text("text") for page in doc)


def pdf_page_image(page: fitz.Page) -> Image.Image:
    matrix = fitz.Matrix(2.2, 2.2)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def pdf_ocr_text(data: bytes, max_pages: int = 3) -> tuple[str, float | None]:
    texts: list[str] = []
    scores: list[float] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for index, page in enumerate(doc):
            if index >= max_pages:
                break
            text, score = ocr_image(pdf_page_image(page))
            if text:
                texts.append(text)
            if score is not None:
                scores.append(score)
    return "\n\f\n".join(texts), (round(sum(scores) / len(scores), 3) if scores else None)


def looks_like_good_embedded_text(text: str, hint: str) -> bool:
    compact = " ".join(text.split())
    if len(compact) < 500:
        return False
    upper = compact.upper()
    hint = hint.upper()
    if hint == "RC":
        # Old scanned RC PDFs may contain a poor OCR layer. Require recognizable labels/number.
        has_rc_words = any(x in upper for x in ("REGISTRATION CERTIFICATE", "REGN NUMBER", "REGN. NUMBER", "VEHICLE CLASS"))
        has_reg = bool(__import__("re").search(r"\b[A-Z]{2}\s*[- ]?\s*\d{1,2}\s*[- ]?\s*[A-Z]{1,3}\s*[- ]?\s*\d{1,4}\b", upper))
        return has_rc_words and has_reg
    if hint == "AADHAAR":
        return any(x in upper for x in ("AADHAAR", "UNIQUE IDENTIFICATION AUTHORITY OF INDIA", "GOVERNMENT OF INDIA"))
    return any(x in upper for x in ("POLICY", "CERTIFICATE OF INSURANCE", "INSURANCE START DATE"))


@app.get("/health")
def health():
    return {"success": True, "service": "agentsindia-document-reader", "version": "2.0.0"}


@app.post("/extract")
async def extract(
    file: UploadFile = File(...),
    documentType: str = Form("AUTO"),
):
    hint = (documentType or "AUTO").upper()
    if hint not in {"AUTO", "POLICY", "OLD_POLICY", "RC", "AADHAAR"}:
        hint = "AUTO"

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded document is empty.")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Document must be 12 MB or smaller.")

    filename = (file.filename or "document").lower()
    content_type = (file.content_type or "").lower()
    is_pdf = content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png", ".webp"))

    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Use PDF, JPG, JPEG, PNG or WEBP documents.")

    ocr_score = None
    source = "embedded_pdf_text"

    try:
        if is_pdf:
            text = embedded_pdf_text(data)
            if not looks_like_good_embedded_text(text, hint):
                ocr_text, ocr_score = pdf_ocr_text(data, max_pages=3)
                if ocr_text.strip():
                    # Keep any usable embedded layer too; OCR usually fixes scanned RC cards.
                    text = f"{text}\n\n--- LOCAL OCR ---\n{ocr_text}"
                    source = "pdf_text_plus_local_ocr"
        else:
            image = Image.open(io.BytesIO(data))
            text, ocr_score = ocr_image(image)
            source = "local_ocr"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Local document reading failed: {exc}") from exc

    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text was found in this document.")

    result = parse_document(text, hint)
    result["readerSource"] = source
    if ocr_score is not None:
        result["ocrConfidence"] = ocr_score
    # Never send all raw personal-document text back to the browser in normal operation.
    return {"success": True, "data": result}
