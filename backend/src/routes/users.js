import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

router.post('/register', authenticateUser, async (req, res) => {
  try {
    const { name, age, role, phone, email, village_id, worker_id } = req.body;
    const firebase_uid = req.user.uid;
    const normalizedRole = role === 'ASHA Worker' ? 'ASHA' : role;

    const existingUser = await query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (existingUser.rows.length > 0) {
      return res.json(existingUser.rows[0]);
    }

    const result = await query(
      `INSERT INTO users (firebase_uid, name, age, role, phone, email, village_id, worker_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [firebase_uid, name, age, normalizedRole, phone, email, village_id || null, worker_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const firebase_uid = req.user.uid;
    
    const result = await query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      `SELECT u.id, u.name, u.age, u.role, u.phone, u.email, u.village_id, v.village_name
       FROM users u
       LEFT JOIN villages v ON v.id = u.village_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/village/:villageId/list', authenticateUser, async (req, res) => {
  try {
    const { villageId } = req.params;
    const actor = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) return res.status(404).json({ error: 'User not found' });

    const role = actor.rows[0].role;
    if (!['ASHA', 'Doctor'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await query(
      `SELECT id, name, age, role, phone, village_id
       FROM users
       WHERE village_id = $1
       ORDER BY name ASC`,
      [villageId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching village users:', error);
    res.status(500).json({ error: 'Failed to fetch village users' });
  }
});

export default router;
