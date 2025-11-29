import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';

const router = express.Router();

const profileColumns = `
  id, user_id, full_name, age, gender, phone, address, village_name,
  emergency_contact, family_id, height_cm, weight_kg, bp_systolic,
  bp_diastolic, heart_rate, temperature, blood_sugar, spo2,
  existing_diseases, allergies, past_surgeries, smoker,
  alcohol_consumption, activity_level, eating_pattern,
  covid_vaccination_status, tetanus_vaccine_date, other_vaccinations,
  created_at, updated_at
`;

const toCamelCaseProfile = (row) => {
  if (!row) return null;

  return {
    userId: row.user_id,
    fullName: row.full_name,
    age: row.age,
    gender: row.gender,
    phoneNumber: row.phone,
    address: row.address,
    villageName: row.village_name,
    emergencyContact: row.emergency_contact,
    familyId: row.family_id,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    bpSystolic: row.bp_systolic,
    bpDiastolic: row.bp_diastolic,
    heartRate: row.heart_rate,
    bodyTemperature: row.temperature,
    bloodSugar: row.blood_sugar,
    oxygenLevel: row.spo2,
    existingDiseases: row.existing_diseases || [],
    allergies: row.allergies || [],
    pastSurgeries: row.past_surgeries,
    isSmoker: row.smoker,
    alcoholConsumption: row.alcohol_consumption,
    activityLevel: row.activity_level,
    eatingPattern: row.eating_pattern,
    covidVaccinationStatus: row.covid_vaccination_status,
    tetanusVaccineDate: row.tetanus_vaccine_date,
    otherVaccinations: row.other_vaccinations,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const getCurrentUserId = async (firebaseUid) => {
  const userResult = await query(
    'SELECT id FROM users WHERE firebase_uid = $1',
    [firebaseUid]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  return userResult.rows[0].id;
};

router.get('/me', authenticateUser, async (req, res) => {
  try {
    const userId = await getCurrentUserId(req.user.uid);

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileResult = await query(
      `SELECT ${profileColumns} FROM villager_profiles WHERE user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(toCamelCaseProfile(profileResult.rows[0]));
  } catch (error) {
    console.error('Error fetching villager profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;

    const profileResult = await query(
      `SELECT ${profileColumns} FROM villager_profiles WHERE user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(toCamelCaseProfile(profileResult.rows[0]));
  } catch (error) {
    console.error('Error fetching villager profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/me', authenticateUser, async (req, res) => {
  try {
    const userId = await getCurrentUserId(req.user.uid);

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      fullName,
      age,
      gender,
      phoneNumber,
      address,
      villageName,
      emergencyContact,
      familyId,
      heightCm,
      weightKg,
      bpSystolic,
      bpDiastolic,
      heartRate,
      bodyTemperature,
      bloodSugar,
      oxygenLevel,
      existingDiseases = [],
      allergies = [],
      pastSurgeries,
      isSmoker,
      alcoholConsumption,
      activityLevel,
      eatingPattern,
      covidVaccinationStatus,
      tetanusVaccineDate,
      otherVaccinations
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const upsertQuery = `
      INSERT INTO villager_profiles (
        user_id, full_name, age, gender, phone, address, village_name,
        emergency_contact, family_id, height_cm, weight_kg, bp_systolic,
        bp_diastolic, heart_rate, temperature, blood_sugar, spo2,
        existing_diseases, allergies, past_surgeries, smoker,
        alcohol_consumption, activity_level, eating_pattern,
        covid_vaccination_status, tetanus_vaccine_date, other_vaccinations,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18::jsonb, $19::jsonb, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        village_name = EXCLUDED.village_name,
        emergency_contact = EXCLUDED.emergency_contact,
        family_id = EXCLUDED.family_id,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        bp_systolic = EXCLUDED.bp_systolic,
        bp_diastolic = EXCLUDED.bp_diastolic,
        heart_rate = EXCLUDED.heart_rate,
        temperature = EXCLUDED.temperature,
        blood_sugar = EXCLUDED.blood_sugar,
        spo2 = EXCLUDED.spo2,
        existing_diseases = EXCLUDED.existing_diseases,
        allergies = EXCLUDED.allergies,
        past_surgeries = EXCLUDED.past_surgeries,
        smoker = EXCLUDED.smoker,
        alcohol_consumption = EXCLUDED.alcohol_consumption,
        activity_level = EXCLUDED.activity_level,
        eating_pattern = EXCLUDED.eating_pattern,
        covid_vaccination_status = EXCLUDED.covid_vaccination_status,
        tetanus_vaccine_date = EXCLUDED.tetanus_vaccine_date,
        other_vaccinations = EXCLUDED.other_vaccinations,
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${profileColumns}
    `;

    const values = [
      userId,
      fullName,
      age || null,
      gender || null,
      phoneNumber || null,
      address || null,
      villageName || null,
      emergencyContact || null,
      familyId || null,
      heightCm || null,
      weightKg || null,
      bpSystolic || null,
      bpDiastolic || null,
      heartRate || null,
      bodyTemperature || null,
      bloodSugar || null,
      oxygenLevel || null,
      JSON.stringify(existingDiseases),
      JSON.stringify(allergies),
      pastSurgeries || null,
      typeof isSmoker === 'boolean' ? isSmoker : null,
      alcoholConsumption || null,
      activityLevel || null,
      eatingPattern || null,
      covidVaccinationStatus || null,
      tetanusVaccineDate || null,
      otherVaccinations || null
    ];

    const upsertResult = await query(upsertQuery, values);

    res.json(toCamelCaseProfile(upsertResult.rows[0]));
  } catch (error) {
    console.error('Error saving villager profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;

