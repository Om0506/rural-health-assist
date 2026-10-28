import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData, requireRole } from '../middleware/authorization.js';
import { addCaseTimelineEvent, attachRecordToCaseIfMissing } from '../services/caseWorkflowService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Maximum size is 15 MB.' });
  }
  if (err.message === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({
      error: 'Unsupported file type. Please upload PDF or image files (JPG, PNG, WEBP).',
    });
  }
  if (err.message === 'Unexpected field') {
    return res.status(400).json({ error: 'Invalid upload field. Use the file input provided.' });
  }
  console.error('Upload middleware error:', err);
  return res.status(400).json({ error: err.message || 'Upload failed' });
}

router.get('/patient/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId } = req.params;
    const docs = await query(
      `SELECT d.*, u.name AS uploaded_by_name
       FROM medical_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.patient_id = $1
       ORDER BY d.created_at DESC
       LIMIT 100`,
      [userId]
    );
    return res.json(docs.rows);
  } catch (error) {
    console.error('Error listing medical documents:', error);
    return res.status(500).json({ error: 'Failed to load documents' });
  }
});

router.post(
  '/patient/:userId/upload',
  authenticateUser,
  requireRole(['ASHA', 'Doctor']),
  canAccessUserData,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      return next();
    });
  },
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'File is required' });

      const actor = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);
      if (!actor.rows.length) return res.status(404).json({ error: 'User not found' });

      const { category = 'general', title = '', notes = '', case_id = null } = req.body || {};
      const linkedCaseId = await attachRecordToCaseIfMissing({
        patientId: Number(userId),
        explicitCaseId: case_id || null,
      });

      const inserted = await query(
        `INSERT INTO medical_documents
          (patient_id, uploaded_by, category, title, original_name, stored_name, mime_type, size_bytes, notes, case_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          Number(userId),
          actor.rows[0].id,
          String(category || 'general').slice(0, 50),
          title ? String(title).slice(0, 255) : null,
          req.file.originalname?.slice(0, 255) || null,
          req.file.filename,
          req.file.mimetype?.slice(0, 120) || null,
          req.file.size || null,
          notes ? String(notes).slice(0, 5000) : null,
          linkedCaseId,
        ]
      );
      if (linkedCaseId) {
        await addCaseTimelineEvent({
          caseId: linkedCaseId,
          eventType: 'REPORT_UPLOADED',
          title: 'Medical report uploaded',
          details: title || req.file.originalname || 'Document uploaded',
          actorUserId: actor.rows[0].id,
        });
      }

      return res.status(201).json(inserted.rows[0]);
    } catch (error) {
      console.error('Error uploading medical document:', error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

router.get('/:docId/download', authenticateUser, async (req, res) => {
  try {
    const { docId } = req.params;
    const docRes = await query(`SELECT * FROM medical_documents WHERE id = $1`, [docId]);
    if (!docRes.rows.length) return res.status(404).json({ error: 'Document not found' });
    const doc = docRes.rows[0];

    // Reuse canAccessUserData semantics by setting param and calling it.
    // (We keep the access model consistent without new auth logic.)
    req.params.userId = String(doc.patient_id);
    await new Promise((resolve, reject) => {
      canAccessUserData(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const filePath = path.join(uploadsDir, doc.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(doc.original_name || 'document').replaceAll('"', '')}"`
    );
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error downloading medical document:', error);
    return res.status(500).json({ error: 'Failed to download document' });
  }
});

export default router;

