# AI Defect Detection Service

FastAPI 기반 YOLO v11 X-ray 불량 검출 서비스

## 설치 및 실행

### 1. 가상환경 생성 (권장)
```bash
cd /home/islab/redesign/ai-service
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate     # Windows
```

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 서비스 실행
```bash
python main.py
```

서비스가 실행되면:
- API 서버: http://localhost:5001
- API 문서: http://localhost:5001/docs
- Health Check: http://localhost:5001/health

## API 사용법

### 1. Health Check
```bash
curl http://localhost:5001/health
```

### 2. 이미지 검사
```bash
curl -X POST "http://localhost:5001/predict" \
  -F "file=@/path/to/xray/image.jpg"
```

### 3. API 문서 확인
브라우저에서 http://localhost:5001/docs 접속

## 응답 예시

```json
{
  "verdict": "NG",
  "confidence": 0.95,
  "detections": [
    {
      "class_name": "defect",
      "confidence": 0.95,
      "bbox": {
        "x": 100,
        "y": 150,
        "width": 50,
        "height": 60
      }
    }
  ],
  "total_defects": 1,
  "image_url": "http://localhost:5001/uploads/20251126_120000_image.jpg",
  "annotated_image_url": "http://localhost:5001/uploads/annotated_20251126_120000_image.jpg",
  "processing_time_ms": 123.45
}
```

## 주의사항

- YOLO 모델 경로 확인: `../X-Ray-Defect-Detection/results/defect/20251120_092725/train/weights/best.pt`
- GPU 사용 시 CUDA 설정 확인
- 업로드된 이미지는 `./uploads` 폴더에 저장됨
