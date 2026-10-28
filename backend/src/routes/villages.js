import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM villages ORDER BY village_name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching villages:', error);
    res.status(500).json({ error: 'Failed to fetch villages' });
  }
});

router.post('/', authenticateUser, requireRole(['Doctor']), async (req, res) => {
  try {
    const { village_name, village_code, district, state, population } = req.body;
    const result = await query(
      `INSERT INTO villages (village_name, village_code, district, state, population)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [village_name, village_code, district, state, population || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating village:', error);
    res.status(500).json({ error: 'Failed to create village' });
  }
});

router.post('/assign', authenticateUser, requireRole(['Doctor']), async (req, res) => {
  try {
    const { asha_worker_id, village_id } = req.body;
    const result = await query(
      `INSERT INTO asha_villages (asha_worker_id, village_id)
       VALUES ($1, $2)
       ON CONFLICT (asha_worker_id, village_id) DO NOTHING
       RETURNING *`,
      [asha_worker_id, village_id]
    );
    res.status(201).json(result.rows[0] || { asha_worker_id, village_id });
  } catch (error) {
    console.error('Error assigning village:', error);
    res.status(500).json({ error: 'Failed to assign village' });
  }
});

router.get('/assigned/me', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const actor = await query('SELECT id, role, village_id FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (!actor.rows.length) return res.status(404).json({ error: 'User not found' });
    const { id, role, village_id } = actor.rows[0];

    if (role === 'Doctor') {
      const allVillages = await query('SELECT * FROM villages ORDER BY village_name ASC');
      return res.json(allVillages.rows);
    }

    const result = await query(
      `SELECT DISTINCT v.*
       FROM villages v
       LEFT JOIN asha_villages av ON av.village_id = v.id
       WHERE av.asha_worker_id = $1 OR v.id = $2
       ORDER BY v.village_name ASC`,
      [id, village_id]
    );

    if (!result.rows.length) {
      const allVillages = await query('SELECT * FROM villages ORDER BY village_name ASC');
      return res.json(allVillages.rows);
    }

    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned villages:', error);
    return res.status(500).json({ error: 'Failed to fetch assigned villages' });
  }
});

router.get('/:id/records', authenticateUser, requireRole(['ASHA', 'Doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const villagersResult = await query('SELECT id, age, role FROM users WHERE village_id = $1', [id]);
    const villagers = villagersResult.rows.filter((u) => u.role === 'Villager');
    const villagerIds = villagers.map((u) => u.id);

    let recentCases = [];
    if (villagerIds.length > 0) {
      const recentCasesResult = await query(
        `SELECT hr.*
         FROM health_records hr
         WHERE hr.user_id = ANY($1::int[]) OR hr.patient_id = ANY($1::int[])
         ORDER BY COALESCE(hr.created_at, hr.date) DESC
         LIMIT 20`,
        [villagerIds]
      );
      recentCases = recentCasesResult.rows;
    }

    const elderly = villagers.filter((u) => Number(u.age || 0) >= 60).length;
    const children = villagers.filter((u) => Number(u.age || 0) <= 12).length;

    return res.json({
      village_id: Number(id),
      total_villagers: villagers.length,
      children,
      pregnant_women: 0,
      elderly_patients: elderly,
      recent_health_cases: recentCases
    });
  } catch (error) {
    console.error('Error fetching village records:', error);
    return res.status(500).json({ error: 'Failed to fetch village records' });
  }
});

export default router;
