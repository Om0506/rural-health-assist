import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';

const router = express.Router();

router.post('/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, severity } = req.body;

    const targetUserResult = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const userResult = await query(
      'SELECT id, role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];
    const isAuthorized = 
      currentUser.role === 'ASHA Worker' || 
      currentUser.role === 'Doctor' || 
      currentUser.id.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You can only flag your own cases' });
    }

    const result = await query(
      'INSERT INTO flagged_cases (user_id, reason, severity) VALUES ($1, $2, $3) RETURNING *',
      [userId, reason, severity || 'moderate']
    );

    await query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [userId, `Your case has been flagged: ${reason}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error flagging case:', error);
    res.status(500).json({ error: 'Failed to flag case' });
  }
});

router.get('/all', authenticateUser, requireRole(['ASHA Worker', 'Doctor']), async (req, res) => {
  try {
    const result = await query(`
      SELECT fc.*, u.name, u.phone 
      FROM flagged_cases fc 
      JOIN users u ON fc.user_id = u.id 
      ORDER BY fc.date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching flagged cases:', error);
    res.status(500).json({ error: 'Failed to fetch flagged cases' });
  }
});

export default router;
