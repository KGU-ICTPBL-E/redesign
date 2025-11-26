"""
AI Defect Detection Service using FastAPI
YOLO v11 기반 X-ray 이미지 불량 검출 서비스
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from datetime import datetime
import shutil

app = FastAPI(
    title="X-Ray Defect Detection API",
    description="YOLO v11 기반 X-ray 이미지 불량 검출 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 설정
RESULT_DIR = "../X-Ray-Defect-Detection/results/defect/20251120_092725"
MODEL_PATH = f"{RESULT_DIR}/train/weights/best.pt"
IMAGE_SIZE = 640
GPU_DEVICE = 0

# 업로드 폴더 설정
UPLOAD_FOLDER = "./uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 모델 로드 (서버 시작 시 한 번만)
print("🔄 Loading YOLO v11 model...")
try:
    model = YOLO(MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    model = None


# Response Models
class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: BoundingBox


class PredictionResponse(BaseModel):
    verdict: str  # "OK" or "NG"
    confidence: float
    detections: List[Detection]
    total_defects: int
    image_url: str
    annotated_image_url: str
    processing_time_ms: float


@app.get("/")
async def root():
    """API 루트"""
    return {
        "service": "X-Ray Defect Detection API",
        "version": "1.0.0",
        "status": "running",
        "model": "YOLO v11",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    return {
        "status": "ok" if model is not None else "error",
        "model": "YOLO v11",
        "model_path": MODEL_PATH,
        "model_loaded": model is not None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_defect(file: UploadFile = File(...)):
    """
    X-ray 이미지 불량 검출 API

    - **file**: X-ray 이미지 파일 (jpg, png)
    - Returns: 검출 결과 (판정, 신뢰도, 바운딩 박스)
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    start_time = datetime.now()

    try:
        # 파일 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 이미지 읽기
        image = cv2.imread(filepath)
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to read image")

        # YOLO 추론
        results = model.predict(
            filepath,
            imgsz=IMAGE_SIZE,
            device=GPU_DEVICE,
            verbose=False
        )

        result = results[0]

        # 검출 결과 처리
        detections = []
        max_confidence = 0.0

        if result.boxes is not None and len(result.boxes) > 0:
            for box in result.boxes:
                confidence = float(box.conf.item())
                max_confidence = max(max_confidence, confidence)

                # 박스 좌표 (xyxy)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                width = int(x2 - x1)
                height = int(y2 - y1)

                detections.append(Detection(
                    class_name="defect",
                    confidence=confidence,
                    bbox=BoundingBox(
                        x=int(x1),
                        y=int(y1),
                        width=width,
                        height=height
                    )
                ))

        # 최종 판정
        verdict = "NG" if len(detections) > 0 else "OK"

        # Annotated 이미지 생성
        annotated_image = image.copy()
        for detection in detections:
            bbox = detection.bbox
            x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height

            # 빨간색 박스
            cv2.rectangle(annotated_image, (x, y), (x + w, y + h), (0, 0, 255), 2)

            # 라벨
            label = f"{detection.class_name}: {detection.confidence:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)

            # 라벨 배경
            cv2.rectangle(annotated_image, (x, y - label_size[1] - 10),
                         (x + label_size[0], y), (0, 0, 255), -1)

            # 라벨 텍스트
            cv2.putText(annotated_image, label, (x, y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Annotated 이미지 저장
        annotated_filename = f"annotated_{filename}"
        annotated_filepath = os.path.join(UPLOAD_FOLDER, annotated_filename)
        cv2.imwrite(annotated_filepath, annotated_image)

        # 처리 시간 계산
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds() * 1000

        return PredictionResponse(
            verdict=verdict,
            confidence=max_confidence,
            detections=detections,
            total_defects=len(detections),
            image_url=f"http://localhost:5001/uploads/{filename}",
            annotated_image_url=f"http://localhost:5001/uploads/{annotated_filename}",
            processing_time_ms=processing_time
        )

    except Exception as e:
        print(f"❌ Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/uploads/{filename}")
async def serve_image(filename: str):
    """업로드된 이미지 제공"""
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001, reload=True)
