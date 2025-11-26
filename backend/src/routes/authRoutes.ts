import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - 신규 사용자 회원가입
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, name, affiliation } = req.body;

    if (!username || !password || !email || !name) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    // 사용자 생성 (is_approved: false)
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email, name, affiliation, is_approved)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, username, email, name, role, is_approved`,
      [username, passwordHash, email, name, affiliation || null]
    );

    res.status(202).json({
      message: 'Registration pending admin approval',
      user: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// POST /api/auth/login - 사용자 인증 및 토큰 발급
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // 사용자 조회
    const result = await pool.query(
      'SELECT id, username, password_hash, role, is_approved FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // 비밀번호 확인
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // JWT 토큰 생성
    const secret = process.env.JWT_SECRET || 'dev_secret_key';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role,
      is_approved: user.is_approved
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// GET /api/auth/status - 관리자 승인 상태 확인 + 프로필 정보
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, name, role, affiliation, is_approved FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_approved) {
      return res.status(403).json({
        approved: false,
        message: '관리자 승인 대기중입니다.'
      });
    }

    res.json({
      approved: true,
      role: user.role,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        affiliation: user.affiliation
      }
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Status check failed', error: error.message });
  }
});

// PUT /api/auth/profile - 사용자 정보 수정 (비밀번호, 이메일, 소속)
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { new_password, new_affiliation, new_email } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (new_password) {
      const passwordHash = await bcrypt.hash(new_password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (new_affiliation !== undefined) {
      updates.push(`affiliation = $${paramIndex++}`);
      values.push(new_affiliation);
    }

    if (new_email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(new_email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    values.push(req.user!.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, name, affiliation, role`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
});

export default router;
