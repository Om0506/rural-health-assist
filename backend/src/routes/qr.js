import express from 'express';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.body;

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const qrData = JSON.stringify({
      userId: userId,
      name: userResult.rows[0].name,
      phone: userResult.rows[0].phone,
      timestamp: new Date().toISOString()
    });

    const qrCodeUrl = await QRCode.toDataURL(qrData);

    const existingQR = await query('SELECT * FROM qrcodes WHERE user_id = $1', [userId]);

    if (existingQR.rows.length > 0) {
      await query(
        'UPDATE qrcodes SET qr_value = $1 WHERE user_id = $2 RETURNING *',
        [qrCodeUrl, userId]
      );
    } else {
      await query(
        'INSERT INTO qrcodes (user_id, qr_value) VALUES ($1, $2)',
        [userId, qrCodeUrl]
      );
    }

    res.json({ qrCode: qrCodeUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'SELECT qr_value FROM qrcodes WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

export default router;
