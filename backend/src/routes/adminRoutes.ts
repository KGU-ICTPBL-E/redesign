import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/users/pending - 회원가입 승인 대기 사용자 목록
router.get('/users/pending', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, name, affiliation, role, created_at
       FROM users
       WHERE is_approved = false
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Failed to fetch pending users', error: error.message });
  }
});

// POST /api/admin/users/approve - 사용자 가입 승인
router.post('/users/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_approved = true
       WHERE id = $1
       RETURNING id, username, email, name, role, is_approved`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User approved successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Failed to approve user', error: error.message });
  }
});

// POST /api/admin/users/reject - 사용자 가입 반려(거절)
router.post('/users/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User rejected and removed',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: 'Failed to reject user', error: error.message });
  }
});

// PUT /api/admin/users/role - 사용자 권한(역할) 변경
router.put('/users/role', async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, new_role } = req.body;

    if (!user_id || !new_role) {
      return res.status(400).json({ message: 'user_id and new_role are required' });
    }

    if (new_role !== 'user' && new_role !== 'admin') {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, username, email, name, role`,
      [new_role, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update role', error: error.message });
  }
});

// GET /api/admin/reports - 기간별 리포트 데이터 조회
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, detector_id } = req.query;

    let query = `
      SELECT
        log_id,
        detector_id,
        timestamp,
        final_verdict,
        confidence_score,
        is_false_positive
      FROM inspection_logs
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(start_date);
    }

    if (end_date) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(end_date);
    }

    if (detector_id) {
      query += ` AND detector_id = $${paramIndex++}`;
      values.push(detector_id);
    }

    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, values);

    // Calculate summary statistics
    const total = result.rows.length;
    const defects = result.rows.filter(r => r.final_verdict === 'NG').length;
    const falsePositives = result.rows.filter(r => r.is_false_positive).length;

    res.json({
      summary: {
        total_inspections: total,
        defects: defects,
        false_positives: falsePositives,
        defect_rate: total > 0 ? (defects / total).toFixed(4) : 0
      },
      logs: result.rows
    });
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Failed to fetch reports', error: error.message });
  }
});

// GET /api/admin/users - 전체 사용자 목록 (추가 기능)
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, name, affiliation, role, is_approved, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

export default router;
