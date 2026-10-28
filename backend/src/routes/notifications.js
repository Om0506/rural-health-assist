import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const actor = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const actorId = actor.rows[0].id;
    const actorRole = actor.rows[0].role === 'ASHA Worker' ? 'ASHA' : actor.rows[0].role;
    if (actorId !== Number(userId) && actorRole !== 'Doctor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT
        n.id,
        n.user_id,
        n.patient_id,
        n.case_id,
        COALESCE(n.title, 'Notification') AS title,
        n.message,
        COALESCE(n.type, 'system') AS type,
        n.is_read,
        COALESCE(n.created_at, n.date) AS created_at,
        p.name AS patient_name,
        v.village_name,
        hc.status AS case_status
      FROM notifications n
      LEFT JOIN users p ON p.id = n.patient_id
      LEFT JOIN villages v ON v.id = p.village_id
      LEFT JOIN healthcare_cases hc ON hc.id = n.case_id
      WHERE n.user_id = $1
      ORDER BY COALESCE(n.created_at, n.date) DESC
      LIMIT 20`,
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

    const actor = await query('SELECT id, role FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
       AND (
         user_id = $2
         OR $3 = 'Doctor'
       )`,
      [notificationId, actor.rows[0].id, actor.rows[0].role]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
