import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY date DESC LIMIT 20',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/:notificationId/read', authenticateUser, async (req, res) => {
  try {
    const { notificationId } = req.params;

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [notificationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
