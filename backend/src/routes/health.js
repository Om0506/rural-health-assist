import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole, canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

router.post('/add', authenticateUser, requireRole(['ASHA Worker', 'Doctor']), async (req, res) => {
  try {
    const { userId, vitals, notes } = req.body;

    const userExists = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const result = await query(
      'INSERT INTO health_records (user_id, vitals, notes) VALUES ($1, $2, $3) RETURNING *',
      [userId, JSON.stringify(vitals), notes]
    );

    await query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [userId, 'Your health record has been updated']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding health record:', error);
    res.status(500).json({ error: 'Failed to add health record' });
  }
});

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'SELECT * FROM health_records WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching health records:', error);
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

export default router;
