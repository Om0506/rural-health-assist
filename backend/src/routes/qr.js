import express from 'express';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.body;

    const targetUserResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUserResult = await query(
      'SELECT id, role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    const currentUser = currentUserResult.rows[0];
    const isAuthorized = 
      currentUser.role === 'ASHA Worker' || 
      currentUser.role === 'Doctor' || 
      currentUser.id.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You can only generate QR codes for yourself' });
    }

    const profileResult = await query(
      `SELECT 
        full_name,
        age,
        gender,
        phone,
        address,
        village_name,
        emergency_contact,
        family_id,
        height_cm,
        weight_kg,
        bp_systolic,
        bp_diastolic,
        heart_rate,
        temperature,
        blood_sugar,
        spo2,
        existing_diseases,
        allergies,
        past_surgeries,
        smoker,
        alcohol_consumption,
        activity_level,
        eating_pattern,
        covid_vaccination_status,
        tetanus_vaccine_date,
        other_vaccinations,
        updated_at
      FROM villager_profiles
      WHERE user_id = $1`,
      [userId]
    );

    const villagerProfile = profileResult.rows[0];

    const qrPayload = {
      type: 'RHA_HEALTH_CARD',
      userId: Number(userId),
      name: targetUserResult.rows[0].name,
      phone: targetUserResult.rows[0].phone,
      generatedAt: new Date().toISOString()
    };

    if (villagerProfile) {
      qrPayload.profile = {
        fullName: villagerProfile.full_name,
        age: villagerProfile.age,
        gender: villagerProfile.gender,
        phoneNumber: villagerProfile.phone,
        address: villagerProfile.address,
        villageName: villagerProfile.village_name,
        emergencyContact: villagerProfile.emergency_contact,
        familyId: villagerProfile.family_id,
        vitals: {
          heightCm: villagerProfile.height_cm,
          weightKg: villagerProfile.weight_kg,
          bloodPressure: villagerProfile.bp_systolic && villagerProfile.bp_diastolic
            ? `${villagerProfile.bp_systolic}/${villagerProfile.bp_diastolic}`
            : null,
          heartRate: villagerProfile.heart_rate,
          bodyTemperature: villagerProfile.temperature,
          bloodSugar: villagerProfile.blood_sugar,
          spo2: villagerProfile.spo2
        },
        medicalHistory: {
          existingDiseases: villagerProfile.existing_diseases || [],
          allergies: villagerProfile.allergies || [],
          pastSurgeries: villagerProfile.past_surgeries
        },
        lifestyle: {
          isSmoker: villagerProfile.smoker,
          alcoholConsumption: villagerProfile.alcohol_consumption,
          activityLevel: villagerProfile.activity_level,
          eatingPattern: villagerProfile.eating_pattern
        },
        vaccinations: {
          covidVaccinationStatus: villagerProfile.covid_vaccination_status,
          tetanusVaccineDate: villagerProfile.tetanus_vaccine_date,
          otherVaccinations: villagerProfile.other_vaccinations
        },
        lastUpdated: villagerProfile.updated_at
      };
    }

    const qrData = JSON.stringify(qrPayload);

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

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
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
