import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

// AI 서비스 URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// 업로드 폴더 설정
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png) are allowed'));
    }
  }
});

/**
 * POST /api/inspection/upload
 * 이미지 업로드 및 AI 검사 실행
 */
router.post('/upload', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { detector_id } = req.body;

    if (!detector_id) {
      return res.status(400).json({ message: 'detector_id is required' });
    }

    // AI 서비스로 이미지 전송
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));

    console.log(`📤 Sending image to AI service: ${AI_SERVICE_URL}/predict`);

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000 // 30초 타임아웃
    });

    const aiResult = aiResponse.data;

    console.log(`✅ AI prediction received: ${aiResult.verdict} (${aiResult.total_defects} defects)`);

    // 고유 log_id 생성
    const logIdPrefix = aiResult.verdict === 'NG' ? 'ERR' : 'OK';
    const timestamp = Date.now();
    const logId = `${logIdPrefix}${timestamp}`;

    // bbox_coords를 JSONB 형식으로 변환
    const bboxCoords = aiResult.detections.length > 0
      ? JSON.stringify(aiResult.detections.map((d: any) => ({
          x: d.bbox.x,
          y: d.bbox.y,
          width: d.bbox.width,
          height: d.bbox.height,
          class: d.class_name,
          confidence: d.confidence
        })))
      : null;

    // 이미지 URL 결정: NG면 annotated 이미지, OK면 원본 이미지
    const displayImageUrl = aiResult.verdict === 'NG'
      ? aiResult.annotated_image_url  // AI 서비스의 annotated 이미지
      : aiResult.image_url;            // AI 서비스의 원본 이미지

    // DB에 검사 결과 저장
    const insertQuery = `
      INSERT INTO inspection_logs (
        log_id, detector_id, final_verdict, confidence_score,
        bbox_coords, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      logId,
      detector_id,
      aiResult.verdict,
      aiResult.confidence,
      bboxCoords,
      displayImageUrl
    ]);

    const log = result.rows[0];

    res.json({
      message: 'Inspection completed successfully',
      log: {
        log_id: log.log_id,
        detector_id: log.detector_id,
        timestamp: log.timestamp,
        final_verdict: log.final_verdict,
        confidence_score: log.confidence_score,
        bbox_coords: log.bbox_coords,
        image_url: log.image_url,
        total_defects: aiResult.total_defects,
        processing_time_ms: aiResult.processing_time_ms
      }
    });

  } catch (error: any) {
    console.error('❌ Inspection error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'AI service is not available',
        error: 'Cannot connect to AI service. Please ensure it is running.'
      });
    }

    res.status(500).json({
      message: 'Inspection failed',
      error: error.message
    });
  }
});

/**
 * GET /api/inspection/batch
 * 배치 검사 - DEFECT_DATASET의 이미지들을 검사
 */
router.post('/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { detector_id, image_dir } = req.body;

    if (!detector_id || !image_dir) {
      return res.status(400).json({ message: 'detector_id and image_dir are required' });
    }

    // 이미지 디렉토리 확인
    if (!fs.existsSync(image_dir)) {
      return res.status(400).json({ message: 'Image directory does not exist' });
    }

    // 이미지 파일 목록 가져오기
    const files = fs.readdirSync(image_dir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });

    if (files.length === 0) {
      return res.status(400).json({ message: 'No image files found in directory' });
    }

    console.log(`📦 Starting batch inspection: ${files.length} images`);

    const results = [];

    // 각 이미지 처리
    for (const file of files) {
      try {
        const filePath = path.join(image_dir, file);

        // AI 서비스로 전송
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
          headers: formData.getHeaders(),
          timeout: 30000
        });

        const aiResult = aiResponse.data;

        // log_id 생성
        const logIdPrefix = aiResult.verdict === 'NG' ? 'ERR' : 'OK';
        const timestamp = Date.now();
        const logId = `${logIdPrefix}${timestamp}`;

        // bbox_coords 변환
        const bboxCoords = aiResult.detections.length > 0
          ? JSON.stringify(aiResult.detections.map((d: any) => ({
              x: d.bbox.x,
              y: d.bbox.y,
              width: d.bbox.width,
              height: d.bbox.height,
              class: d.class_name,
              confidence: d.confidence
            })))
          : null;

        // 이미지 URL 결정: NG면 annotated 이미지, OK면 원본 이미지
        const displayImageUrl = aiResult.verdict === 'NG'
          ? aiResult.annotated_image_url
          : aiResult.image_url;

        // DB에 저장
        const insertQuery = `
          INSERT INTO inspection_logs (
            log_id, detector_id, final_verdict, confidence_score,
            bbox_coords, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
          logId,
          detector_id,
          aiResult.verdict,
          aiResult.confidence,
          bboxCoords,
          displayImageUrl
        ]);

        results.push({
          file,
          log_id: logId,
          verdict: aiResult.verdict,
          defects: aiResult.total_defects
        });

        console.log(`  ✅ ${file}: ${aiResult.verdict} (${aiResult.total_defects} defects)`);

      } catch (error: any) {
        console.error(`  ❌ ${file}: ${error.message}`);
        results.push({
          file,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Batch inspection completed',
      total: files.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results
    });

  } catch (error: any) {
    console.error('❌ Batch inspection error:', error.message);
    res.status(500).json({
      message: 'Batch inspection failed',
      error: error.message
    });
  }
});

// GET /api/inspection/logs - 검사 이력 조회
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT
        log_id,
        detector_id,
        final_verdict,
        confidence_score,
        timestamp,
        image_url,
        bbox_coords
      FROM inspection_logs
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      logs: result.rows,
      total: result.rowCount
    });
  } catch (error: any) {
    console.error('❌ Get inspection logs error:', error.message);
    res.status(500).json({
      message: 'Failed to get inspection logs',
      error: error.message
    });
  }
});

export default router;
