import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';
import {
  addCaseTimelineEvent,
  attachRecordToCaseIfMissing,
  CASE_STATUS,
  updateHealthcareCaseStatus,
} from '../services/caseWorkflowService.js';

const router = express.Router();

router.use(authenticateUser, requireRole(['Doctor']));

const getDoctor = async (firebaseUid) => {
  const actor = await query('SELECT id, role, name FROM users WHERE firebase_uid = $1', [firebaseUid]);
  return actor.rows[0] || null;
};

router.get('/overview', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const [patientsRes, activeRes, aiEscalatedRes, ashaFollowRes, villagesRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'Villager'`),
      query(
        `SELECT COUNT(DISTINCT hc.id)::int AS total
         FROM healthcare_cases hc
         WHERE hc.status <> 'RESOLVED'`
      ),
      query(
        `SELECT COUNT(DISTINCT hc.id)::int AS total
         FROM healthcare_cases hc
         LEFT JOIN flagged_cases fc ON fc.case_id = hc.id
         WHERE hc.status <> 'RESOLVED'
         AND (
           hc.status = 'DOCTOR_ESCALATED'
           OR fc.triage_status = 'DOCTOR_ESCALATED'
           OR (fc.source = 'ai_triage' AND COALESCE(fc.risk_score, 0) >= 80)
           OR fc.severity IN ('critical', 'high', 'SEVERE')
         )`
      ),
      query(
        `SELECT COUNT(DISTINCT hc.id)::int AS total
         FROM healthcare_cases hc
         LEFT JOIN flagged_cases fc ON fc.case_id = hc.id
         WHERE hc.status <> 'RESOLVED'
         AND fc.triage_status = 'ASHA_REVIEW'`
      ),
      query(`SELECT COUNT(*)::int AS total FROM villages`)
    ]);

    return res.json({
      totalPatients: patientsRes.rows[0]?.total || 0,
      activeCases: activeRes.rows[0]?.total || 0,
      flaggedCases: activeRes.rows[0]?.total || 0,
      aiEscalatedCases: aiEscalatedRes.rows[0]?.total || 0,
      ashaFollowUps: ashaFollowRes.rows[0]?.total || 0,
      villagesCovered: villagesRes.rows[0]?.total || 0,
      severeCases: aiEscalatedRes.rows[0]?.total || 0
    });
  } catch (error) {
    console.error('Error loading doctor overview:', error);
    return res.status(500).json({ error: 'Failed to load doctor overview' });
  }
});

router.get('/flagged-cases', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         fc.id,
         fc.case_id,
         fc.user_id,
         fc.patient_id,
         fc.reason,
         fc.severity,
         fc.status,
         hc.status AS case_status,
         fc.risk_score,
         fc.triage_status,
         fc.escalation_reason,
         hc.escalation_reason AS case_escalation_reason,
         hc.risk_level AS case_risk_level,
         hc.assigned_doctor AS assigned_doctor_id,
         fc.structured_symptoms,
         fc.source,
         fc.symptoms_summary,
         fc.doctor_notes,
         COALESCE(fc.created_at, fc.date) AS created_at,
         p.name AS patient_name,
         p.village_id,
         v.village_name,
         aw.name AS flagged_by,
         doc.name AS assigned_doctor_name
       FROM flagged_cases fc
       JOIN users p ON p.id = COALESCE(fc.patient_id, fc.user_id)
       LEFT JOIN villages v ON v.id = p.village_id
       LEFT JOIN users aw ON aw.id = fc.asha_worker_id
       LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
       LEFT JOIN users doc ON doc.id = hc.assigned_doctor
       ORDER BY COALESCE(fc.created_at, fc.date) DESC
       LIMIT 100`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error loading flagged cases for doctor:', error);
    return res.status(500).json({ error: 'Failed to load flagged cases' });
  }
});

/** High-risk AI escalations only (score >= 70 / DOCTOR_ESCALATED) */
router.get('/escalated-cases', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         fc.id,
         fc.case_id,
         fc.user_id,
         fc.patient_id,
         fc.reason,
         fc.severity,
         fc.status,
         hc.status AS case_status,
         fc.risk_score,
         fc.triage_status,
         fc.escalation_reason,
         hc.escalation_reason AS case_escalation_reason,
         hc.risk_level AS case_risk_level,
         hc.assigned_doctor AS assigned_doctor_id,
         fc.structured_symptoms,
         fc.source,
         fc.symptoms_summary,
         fc.doctor_notes,
         COALESCE(fc.created_at, fc.date) AS created_at,
         p.name AS patient_name,
         p.age AS patient_age,
         p.village_id,
         v.village_name,
         aw.name AS flagged_by,
         doc.name AS assigned_doctor_name
       FROM flagged_cases fc
       JOIN users p ON p.id = COALESCE(fc.patient_id, fc.user_id)
       LEFT JOIN villages v ON v.id = p.village_id
       LEFT JOIN users aw ON aw.id = fc.asha_worker_id
       LEFT JOIN healthcare_cases hc ON hc.id = fc.case_id
       LEFT JOIN users doc ON doc.id = hc.assigned_doctor
       WHERE fc.status IS DISTINCT FROM 'resolved'
       AND COALESCE(hc.status, 'NEW') <> 'RESOLVED'
       AND (
         fc.triage_status = 'DOCTOR_ESCALATED'
         OR fc.severity IN ('critical', 'high', 'SEVERE')
          OR hc.status = 'DOCTOR_ESCALATED'
       )
       ORDER BY COALESCE(fc.risk_score, 0) DESC, COALESCE(fc.created_at, fc.date) DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error loading escalated cases:', error);
    return res.status(500).json({ error: 'Failed to load escalated cases' });
  }
});

router.put('/flagged-cases/:id/notes', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { id } = req.params;
    const { doctor_notes, status } = req.body;
    const updated = await query(
      `UPDATE flagged_cases
       SET doctor_notes = COALESCE($1, doctor_notes),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING *`,
      [doctor_notes || null, status || null, id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Flagged case not found' });
    const flaggedCase = updated.rows[0];
    if (flaggedCase.case_id) {
      const nextStatus = String(status || '').toLowerCase() === 'resolved'
        ? CASE_STATUS.RESOLVED
        : CASE_STATUS.DOCTOR_ESCALATED;
      await query(`UPDATE healthcare_cases SET assigned_doctor = $1 WHERE id = $2`, [doctor.id, flaggedCase.case_id]);
      await updateHealthcareCaseStatus({
        caseId: flaggedCase.case_id,
        status: nextStatus,
        actorUserId: doctor.id,
        timelineTitle: nextStatus === CASE_STATUS.RESOLVED ? 'Case resolved' : 'Doctor notes updated',
        timelineDetails: doctor_notes || null,
      });
    }
    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error saving doctor notes:', error);
    return res.status(500).json({ error: 'Failed to save notes' });
  }
});

router.post('/flagged-cases/:id/request-asha', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const { id } = req.params;
    const { message: followUpMessage } = req.body;

    const caseRes = await query(`SELECT * FROM flagged_cases WHERE id = $1`, [id]);
    if (!caseRes.rows.length) return res.status(404).json({ error: 'Case not found' });
    const fc = caseRes.rows[0];

    if (fc.asha_worker_id && fc.case_id) {
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          fc.asha_worker_id,
          fc.patient_id || fc.user_id,
          'Doctor requested ASHA follow-up',
          followUpMessage ||
            `Dr. ${doctor.name} requested follow-up for patient ID ${fc.patient_id || fc.user_id}.`,
          'asha_followup',
          fc.case_id || null,
        ]
      );
    }
    if (fc.case_id) {
      await updateHealthcareCaseStatus({
        caseId: fc.case_id,
        status: CASE_STATUS.FOLLOW_UP_PENDING,
        actorUserId: doctor.id,
        timelineTitle: 'Follow-up requested',
        timelineDetails: followUpMessage || 'Doctor requested ASHA follow-up',
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error requesting ASHA follow-up:', error);
    return res.status(500).json({ error: 'Failed to request ASHA follow-up' });
  }
});

router.put('/flagged-cases/:id/resolve', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { id } = req.params;
    const { doctor_notes } = req.body;

    const updated = await query(
      `UPDATE flagged_cases
       SET status = 'resolved', doctor_notes = COALESCE($1, doctor_notes)
       WHERE id = $2
       RETURNING *`,
      [doctor_notes || null, id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ error: 'Flagged case not found' });
    }

    const flaggedCase = updated.rows[0];
    if (flaggedCase.case_id) {
      await updateHealthcareCaseStatus({
        caseId: flaggedCase.case_id,
        status: CASE_STATUS.RESOLVED,
        actorUserId: doctor.id,
        timelineTitle: 'Case resolved',
        timelineDetails: doctor_notes || 'Doctor marked case resolved',
      });
      await query(`UPDATE healthcare_cases SET assigned_doctor = $1 WHERE id = $2`, [doctor.id, flaggedCase.case_id]);
    }
    if (flaggedCase.asha_worker_id) {
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          flaggedCase.asha_worker_id,
          flaggedCase.patient_id || flaggedCase.user_id,
          'Case resolved by doctor',
          `Doctor ${doctor.name} resolved flagged case for patient ID ${flaggedCase.patient_id || flaggedCase.user_id}.`,
          'system',
          flaggedCase.case_id || null,
        ]
      );
    }

    return res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error resolving flagged case:', error);
    return res.status(500).json({ error: 'Failed to resolve flagged case' });
  }
});

router.get('/patients', async (req, res) => {
  try {
    const { search = '', villageId = '' } = req.query;
    const searchTrimmed = String(search || '').trim();
    const hasSearch = Boolean(searchTrimmed);
    const hasVillage = Boolean(villageId);

    const params = [];
    const where = [`u.role = 'Villager'`];

    if (hasSearch) {
      params.push(`%${searchTrimmed}%`);
      params.push(Number.isFinite(Number(searchTrimmed)) ? Number(searchTrimmed) : -1);
      where.push(`(u.name ILIKE $${params.length - 1} OR u.id = $${params.length})`);
    }

    if (hasVillage) {
      params.push(Number(villageId));
      where.push(`u.village_id = $${params.length}`);
    }

    const result = await query(
      `SELECT
         u.id,
         u.name,
         u.age,
         u.phone,
         u.village_id,
         v.village_name,
         (
           SELECT COALESCE(hr.created_at, hr.date)
           FROM health_records hr
           WHERE hr.patient_id = u.id OR hr.user_id = u.id
           ORDER BY COALESCE(hr.created_at, hr.date) DESC
           LIMIT 1
         ) AS last_visit,
         (
           SELECT fc.severity
           FROM flagged_cases fc
           WHERE fc.patient_id = u.id OR fc.user_id = u.id
           ORDER BY COALESCE(fc.created_at, fc.date) DESC
           LIMIT 1
         ) AS latest_severity
       FROM users u
       LEFT JOIN villages v ON v.id = u.village_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.name ASC
       LIMIT 100`,
      params
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Error searching patients:', error);
    return res.status(500).json({ error: 'Failed to search patients' });
  }
});

router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const [profileRes, healthRes, visitsRes, prescriptionsRes, flaggedRes, chatRes] = await Promise.all([
      query(
        `SELECT u.*, v.village_name
         FROM users u
         LEFT JOIN villages v ON v.id = u.village_id
         WHERE u.id = $1`,
        [patientId]
      ),
      query(
        `SELECT
           hr.*,
           d.name AS doctor_name,
           a.name AS asha_name,
           hc.status AS case_status,
           hc.escalation_reason AS case_title
         FROM health_records hr
         LEFT JOIN users d ON d.id = hr.doctor_id
         LEFT JOIN users a ON a.id = hr.asha_worker_id
         LEFT JOIN healthcare_cases hc ON hc.id = hr.case_id
         WHERE hr.patient_id = $1 OR hr.user_id = $1
         ORDER BY COALESCE(hr.created_at, hr.date) DESC
         LIMIT 50`,
        [patientId]
      ),
      query(
        `SELECT dv.*, aw.name AS asha_name
         FROM daily_visits dv
         LEFT JOIN users aw ON aw.id = dv.asha_worker_id
         WHERE dv.patient_id = $1
         ORDER BY dv.visit_date DESC
         LIMIT 50`,
        [patientId]
      ),
      query(
        `SELECT p.*, d.name AS doctor_name
         FROM prescriptions p
         LEFT JOIN users d ON d.id = p.doctor_id
         WHERE p.patient_id = $1 OR p.user_id = $1
         ORDER BY COALESCE(p.created_at, p.date) DESC
         LIMIT 50`,
        [patientId]
      ),
      query(
        `SELECT fc.*, aw.name AS flagged_by
         FROM flagged_cases fc
         LEFT JOIN users aw ON aw.id = fc.asha_worker_id
         WHERE fc.patient_id = $1 OR fc.user_id = $1
         ORDER BY COALESCE(fc.created_at, fc.date) DESC
         LIMIT 50`,
        [patientId]
      ),
      query(
        `SELECT id, session_title, risk_score, triage_status, structured_symptoms, current_severity,
                symptom_memory, created_at, updated_at
         FROM chat_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 10`,
        [patientId]
      )
    ]);

    if (!profileRes.rows.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json({
      patient: profileRes.rows[0],
      healthHistory: healthRes.rows,
      ashaVisits: visitsRes.rows,
      prescriptions: prescriptionsRes.rows,
      flaggedCases: flaggedRes.rows,
      chatSessions: chatRes.rows
    });
  } catch (error) {
    console.error('Error loading doctor patient view:', error);
    return res.status(500).json({ error: 'Failed to load patient details' });
  }
});

router.post('/consultation', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const {
      patient_id,
      symptoms,
      diagnosis,
      medicines,
      instructions,
      follow_up_date,
      case_id
    } = req.body;
    const linkedCaseId = await attachRecordToCaseIfMissing({
      patientId: patient_id,
      explicitCaseId: case_id || null,
    });

    const result = await query(
      `INSERT INTO health_records
      (user_id, patient_id, doctor_id, notes, symptoms, diagnosis, medicines_given, follow_up_date, visit_type, case_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        patient_id,
        patient_id,
        doctor.id,
        instructions || null,
        symptoms || null,
        diagnosis || null,
        medicines || null,
        follow_up_date || null,
        'doctor_visit',
        linkedCaseId,
      ]
    );
    if (linkedCaseId) {
      await query(`UPDATE healthcare_cases SET assigned_doctor = $1 WHERE id = $2`, [doctor.id, linkedCaseId]);
      await addCaseTimelineEvent({
        caseId: linkedCaseId,
        eventType: 'DOCTOR_CONSULTATION',
        title: 'Doctor consultation',
        details: diagnosis || instructions || symptoms || 'Consultation completed',
        actorUserId: doctor.id,
      });
      if (follow_up_date) {
        await updateHealthcareCaseStatus({
          caseId: linkedCaseId,
          status: CASE_STATUS.FOLLOW_UP_PENDING,
          actorUserId: doctor.id,
          timelineTitle: 'Follow-up pending',
          timelineDetails: `Follow-up planned for ${follow_up_date}`,
        });
      }
    }

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating consultation:', error);
    return res.status(500).json({ error: 'Failed to create consultation' });
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.uid);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const { patient_id, medicine_name, dosage, duration, instructions, case_id } = req.body;
    const linkedCaseId = await attachRecordToCaseIfMissing({
      patientId: patient_id,
      explicitCaseId: case_id || null,
    });
    const result = await query(
      `INSERT INTO prescriptions
      (user_id, patient_id, doctor_id, medicine_name, dosage, duration, instructions, doctor_notes, case_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        patient_id,
        patient_id,
        doctor.id,
        medicine_name,
        dosage || null,
        duration || null,
        instructions || null,
        instructions || null,
        linkedCaseId,
      ]
    );
    if (linkedCaseId) {
      await query(`UPDATE healthcare_cases SET assigned_doctor = $1 WHERE id = $2`, [doctor.id, linkedCaseId]);
      await addCaseTimelineEvent({
        caseId: linkedCaseId,
        eventType: 'PRESCRIPTION_ADDED',
        title: 'Prescription added',
        details: `${medicine_name}${dosage ? ` (${dosage})` : ''}`,
        actorUserId: doctor.id,
      });
      await updateHealthcareCaseStatus({
        caseId: linkedCaseId,
        status: CASE_STATUS.PRESCRIPTION_ADDED,
        actorUserId: doctor.id,
        timelineTitle: 'Prescription workflow updated',
        timelineDetails: 'Prescription added; follow-up monitoring may be required.',
      });
      await query(
        `INSERT INTO notifications (user_id, patient_id, title, message, type, case_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          patient_id,
          patient_id,
          'Prescription added',
          `Doctor added a prescription: ${medicine_name}.`,
          'prescription_added',
          linkedCaseId,
        ]
      );
    }
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating prescription:', error);
    return res.status(500).json({ error: 'Failed to create prescription' });
  }
});

router.get('/prescriptions/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await query(
      `SELECT p.*, d.name AS doctor_name, u.name AS patient_name, v.village_name
       FROM prescriptions p
       LEFT JOIN users d ON d.id = p.doctor_id
       LEFT JOIN users u ON u.id = COALESCE(p.patient_id, p.user_id)
       LEFT JOIN villages v ON v.id = u.village_id
       WHERE p.patient_id = $1 OR p.user_id = $1
       ORDER BY COALESCE(p.created_at, p.date) DESC
       LIMIT 50`,
      [patientId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

router.get('/analytics/villages', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         v.id,
         v.village_name,
         COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'Villager')::int AS total_patients,
         COUNT(hr.id) FILTER (WHERE COALESCE(hr.symptoms, '') ILIKE '%fever%')::int AS fever_cases,
         COUNT(hr.id) FILTER (WHERE COALESCE(hr.symptoms, '') ILIKE '%diarrhea%')::int AS diarrhea_cases
       FROM villages v
       LEFT JOIN users u ON u.village_id = v.id
       LEFT JOIN health_records hr ON (hr.patient_id = u.id OR hr.user_id = u.id)
       GROUP BY v.id, v.village_name
       ORDER BY v.village_name ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching village analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch village analytics' });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const [symptomTrends, dehydrationAlerts, persistentAlerts, recentSummaries] = await Promise.all([
      query(
        `SELECT
           COALESCE(structured_symptoms->>'fever', 'false') AS has_fever,
           COUNT(*)::int AS session_count
         FROM chat_sessions
         WHERE structured_symptoms IS NOT NULL
           AND updated_at > NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY session_count DESC`
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM chat_sessions
         WHERE structured_symptoms->>'dehydration' = 'true'
           AND updated_at > NOW() - INTERVAL '14 days'`
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM chat_sessions
         WHERE COALESCE(risk_score, 0) BETWEEN 30 AND 69
           AND updated_at > NOW() - INTERVAL '14 days'`
      ),
      query(
        `SELECT cs.id, cs.user_id, u.name AS patient_name, v.village_name,
                cs.risk_score, cs.triage_status, cs.structured_symptoms, cs.updated_at
         FROM chat_sessions cs
         JOIN users u ON u.id = cs.user_id
         LEFT JOIN villages v ON v.id = u.village_id
         WHERE cs.structured_symptoms IS NOT NULL
         ORDER BY cs.updated_at DESC
         LIMIT 15`
      ),
    ]);

    const feverCount = symptomTrends.rows.find((r) => r.has_fever === 'true')?.session_count || 0;
    const totalSessions = symptomTrends.rows.reduce((s, r) => s + (r.session_count || 0), 0);

    return res.json({
      symptomTrends: {
        feverSessions: feverCount,
        totalTrackedSessions: totalSessions,
      },
      dehydrationAlerts: dehydrationAlerts.rows[0]?.count || 0,
      persistentSymptomAlerts: persistentAlerts.rows[0]?.count || 0,
      recentAiSummaries: recentSummaries.rows.map((row) => ({
        sessionId: row.id,
        patientId: row.user_id,
        patientName: row.patient_name,
        villageName: row.village_name,
        riskScore: row.risk_score,
        triageStatus: row.triage_status,
        structuredSymptoms: row.structured_symptoms,
        updatedAt: row.updated_at,
        summaryText: formatSymptomSummary(row.structured_symptoms),
      })),
    });
  } catch (error) {
    console.error('Error loading doctor insights:', error);
    return res.status(500).json({ error: 'Failed to load health insights' });
  }
});

function formatSymptomSummary(structured) {
  if (!structured || typeof structured !== 'object') return 'No structured symptoms recorded';
  const active = [];
  if (structured.fever) active.push('fever');
  if (structured.dehydration) active.push('dehydration');
  if (structured.weakness) active.push('weakness');
  if (structured.chestPain) active.push('chest pain');
  if (structured.breathingDifficulty) active.push('breathing difficulty');
  if (structured.vomiting) active.push('vomiting');
  if (structured.diarrhea) active.push('diarrhea');
  const duration = structured.durationLabel || structured.duration || '';
  const list = active.length ? active.join(', ') : 'monitoring';
  return duration ? `${list} (${duration})` : list;
}

router.get('/high-risk', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.id,
         u.name,
         u.age,
         v.village_name,
         (
           SELECT COUNT(*)::int
           FROM health_records hr
           WHERE hr.patient_id = u.id OR hr.user_id = u.id
         ) AS visit_count,
         (
           SELECT MAX(COALESCE(fc.severity, ''))
           FROM flagged_cases fc
           WHERE fc.patient_id = u.id OR fc.user_id = u.id
         ) AS latest_severity
       FROM users u
       LEFT JOIN villages v ON v.id = u.village_id
       WHERE u.role = 'Villager'
       AND (
         u.age >= 60
         OR EXISTS (
           SELECT 1
           FROM health_records hr2
           WHERE (hr2.patient_id = u.id OR hr2.user_id = u.id)
           AND (
             COALESCE(hr2.symptoms, '') ILIKE '%diabetes%'
             OR COALESCE(hr2.symptoms, '') ILIKE '%hypertension%'
             OR COALESCE(hr2.notes, '') ILIKE '%chronic%'
           )
         )
         OR (
           SELECT COUNT(*)::int
           FROM health_records hr3
           WHERE hr3.patient_id = u.id OR hr3.user_id = u.id
         ) >= 5
       )
       ORDER BY u.age DESC, u.name ASC
       LIMIT 50`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching high risk patients:', error);
    return res.status(500).json({ error: 'Failed to fetch high risk patients' });
  }
});

export default router;
