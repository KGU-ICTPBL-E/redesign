import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/feed/latest - 대시보드 실시간 업데이트용 최신 검사 결과
router.get('/feed/latest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { detector_id } = req.query;

    let query = `
      SELECT log_id, detector_id, timestamp, final_verdict, confidence_score,
             bbox_coords, image_url, is_false_positive
      FROM inspection_logs
    `;
    const values: any[] = [];

    if (detector_id) {
      query += ' WHERE detector_id = $1';
      values.push(detector_id);
    }

    query += ' ORDER BY timestamp DESC LIMIT 1';

    const logResult = await pool.query(query, values);

    // Get detector status
    const statusQuery = detector_id
      ? 'SELECT * FROM detector_status WHERE detector_id = $1'
      : 'SELECT * FROM detector_status LIMIT 1';
    const statusValues = detector_id ? [detector_id] : [];
    const statusResult = await pool.query(statusQuery, statusValues);

    res.json({
      status: statusResult.rows[0]?.current_status || 'Unknown',
      system_time: new Date().toISOString(),
      latest_log: logResult.rows[0] || null
    });
  } catch (error: any) {
    console.error('Feed latest error:', error);
    res.status(500).json({ message: 'Failed to fetch latest feed', error: error.message });
  }
});

// GET /api/stats/summary - 대시보드 KPI 요약 정보
router.get('/stats/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { duration } = req.query;
    let timeFilter = '';

    if (duration === 'today') {
      timeFilter = "AND timestamp >= CURRENT_DATE";
    } else if (duration === 'week') {
      timeFilter = "AND timestamp >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (duration === 'month') {
      timeFilter = "AND timestamp >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const query = `
      SELECT
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE final_verdict = 'NG') as defects,
        ROUND(
          COUNT(*) FILTER (WHERE final_verdict = 'NG')::numeric /
          NULLIF(COUNT(*), 0),
          4
        ) as defect_rate
      FROM inspection_logs
      WHERE 1=1 ${timeFilter}
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    // Get cumulative usage (total scans ever)
    const cumulativeResult = await pool.query('SELECT COUNT(*) as total FROM inspection_logs');

    res.json({
      total_scans: parseInt(stats.total_scans),
      defects: parseInt(stats.defects),
      defect_rate: parseFloat(stats.defect_rate) || 0,
      cumulative_usage: parseInt(cumulativeResult.rows[0].total)
    });
  } catch (error: any) {
    console.error('Stats summary error:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// GET /api/log/defect/:id - 특정 불량 로그의 상세 정보
router.get('/log/defect/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT log_id, detector_id, timestamp, final_verdict, confidence_score,
              bbox_coords, image_url, is_false_positive
       FROM inspection_logs
       WHERE log_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Log defect error:', error);
    res.status(500).json({ message: 'Failed to fetch log details', error: error.message });
  }
});

// POST /api/log/feedback/:id - 오탐(False Positive) 피드백 기록
router.post('/log/feedback/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback_type } = req.body;

    if (feedback_type !== 'false_positive') {
      return res.status(400).json({ message: 'Invalid feedback type' });
    }

    const result = await pool.query(
      `UPDATE inspection_logs
       SET is_false_positive = true, admin_feedback_user_id = $2
       WHERE log_id = $1
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json({
      message: 'Feedback recorded successfully',
      log: result.rows[0]
    });
  } catch (error: any) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: 'Failed to record feedback', error: error.message });
  }
});

// GET /api/logs/history - 검사 이력 조회 (필터링, 페이지네이션)
router.get('/logs/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      detector_id,
      start_date,
      end_date,
      verdict,
      page = '1',
      limit = '20'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const values: any[] = [];
    let paramIndex = 1;
    let whereConditions: string[] = [];

    // Build WHERE conditions
    if (detector_id) {
      whereConditions.push(`detector_id = $${paramIndex++}`);
      values.push(detector_id);
    }

    if (start_date) {
      whereConditions.push(`timestamp >= $${paramIndex++}::date`);
      values.push(start_date);
    }

    if (end_date) {
      // Include the entire end_date day by adding < next day
      whereConditions.push(`timestamp < ($${paramIndex++}::date + INTERVAL '1 day')`);
      values.push(end_date);
    }

    if (verdict) {
      whereConditions.push(`final_verdict = $${paramIndex++}`);
      values.push(verdict);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM inspection_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated data
    values.push(limit, offset);
    const dataQuery = `
      SELECT log_id, detector_id, timestamp, final_verdict,
             confidence_score, bbox_coords, image_url, is_false_positive
      FROM inspection_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataResult = await pool.query(dataQuery, values);

    res.json({
      logs: dataResult.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Failed to fetch history', error: error.message });
  }
});

export default router;
