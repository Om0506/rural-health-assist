import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authenticateUser, async (req, res) => {
  try {
    const { name, age, role, phone, email } = req.body;
    const firebase_uid = req.user.uid;

    const existingUser = await query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (existingUser.rows.length > 0) {
      return res.json(existingUser.rows[0]);
    }

    const result = await query(
      'INSERT INTO users (firebase_uid, name, age, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [firebase_uid, name, age, role, phone, email]
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

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      'SELECT id, name, age, role, phone, email FROM users WHERE id = $1',
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

export default router;
