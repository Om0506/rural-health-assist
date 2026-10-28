import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import Input, { Textarea, Select } from './ui/Input';
import { documentAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import { useLanguage } from '../context/LanguageContext';

function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mime) {
  const m = String(mime || '').toLowerCase();
  return m.startsWith('image/') || m === 'application/pdf';
}

function buildBlobUrl(blob) {
  try {
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

export default function MedicalDocumentsPanel({
  patientId,
  caseId = null,
  title = 'Medical documents',
  allowUpload = true,
}) {
  const { t } = useLanguage();
  const pid = patientId ? String(patientId) : '';
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [preview, setPreview] = useState({ open: false, url: '', mime: '', name: '' });
  const [uploadForm, setUploadForm] = useState({
    category: 'lab_report',
    title: '',
    notes: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const categories = useMemo(
    () => [
      { value: 'lab_report', label: 'Lab report' },
      { value: 'xray', label: 'X-ray' },
      { value: 'blood_test', label: 'Blood test' },
      { value: 'prescription_scan', label: 'Prescription scan' },
      { value: 'medical_attachment', label: 'Medical attachment' },
      { value: 'general', label: 'General' },
    ],
    []
  );

  const load = async () => {
    if (!pid) return;
    setLoading(true);
    setError('');
    try {
      const res = await documentAPI.listByPatient(pid);
      setDocs(res.data || []);
    } catch (e) {
      console.error(e);
      setDocs([]);
      setError(e?.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!pid) return;
    if (!uploadForm.file) {
      showFeedback('Please choose a file first.');
      return;
    }
    const mime = String(uploadForm.file.type || '').toLowerCase();
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (mime && !allowed.includes(mime)) {
      setError('Unsupported file type. Please upload PDF or image files (JPG, PNG, WEBP).');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', uploadForm.file);
      fd.append('category', uploadForm.category);
      fd.append('title', uploadForm.title);
      fd.append('notes', uploadForm.notes);
      if (caseId) fd.append('case_id', String(caseId));
      await documentAPI.uploadForPatient(pid, fd);
      setUploadForm({ category: uploadForm.category, title: '', notes: '', file: null });
      showFeedback(t('Document uploaded.'));
      await load();
    } catch (e2) {
      console.error(e2);
      setError(getApiErrorMessage(e2, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc) => {
    try {
      const res = await documentAPI.download(doc.id);
      const blob = new Blob([res.data], { type: doc.mime_type || 'application/octet-stream' });
      const url = buildBlobUrl(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name || doc.title || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showFeedback(t('Download failed.'));
    }
  };

  const openPreview = async (doc) => {
    if (!isPreviewable(doc.mime_type)) {
      showFeedback(t('Preview not available. Please download this file.'));
      return;
    }
    try {
      const res = await documentAPI.download(doc.id);
      const blob = new Blob([res.data], { type: doc.mime_type || 'application/octet-stream' });
      const url = buildBlobUrl(blob);
      setPreview({ open: true, url, mime: doc.mime_type || '', name: doc.original_name || doc.title || 'Preview' });
    } catch (e) {
      console.error(e);
      showFeedback(t('Preview failed.'));
    }
  };

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview({ open: false, url: '', mime: '', name: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(title, { defaultValue: title })}</CardTitle>
        <Badge variant="default">
          {caseId ? docs.filter((d) => String(d.case_id || '').toString() === String(caseId)).length : docs.length} file(s)
        </Badge>
      </CardHeader>

      {feedback ? (
        <div className="mb-3 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {allowUpload && (
      <form onSubmit={submitUpload} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Category"
            value={uploadForm.category}
            onChange={(e) => setUploadForm((v) => ({ ...v, category: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Input
            label="Title (optional)"
            value={uploadForm.title}
            onChange={(e) => setUploadForm((v) => ({ ...v, title: e.target.value }))}
            placeholder="e.g. CBC report, X-ray chest"
          />
        </div>

        <Textarea
          label="Notes (optional)"
          rows={2}
          value={uploadForm.notes}
          onChange={(e) => setUploadForm((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Short clinical context…"
        />

        <input
          type="file"
          className="input-field"
          onChange={(e) => setUploadForm((v) => ({ ...v, file: e.target.files?.[0] || null }))}
        />

        <Button type="submit" loading={uploading}>
          {uploading ? 'Uploading…' : 'Upload document'}
        </Button>
      </form>
      )}

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-muted-fg">Loading documents…</p>
        ) : (caseId ? docs.filter((d) => String(d.case_id || '').toString() === String(caseId)).length : docs.length) === 0 ? (
          <EmptyState title="No documents yet" description="Upload lab reports, X-rays, scans, and attachments here." />
        ) : (
          <div className="space-y-2">
            {(caseId ? docs.filter((d) => String(d.case_id || '').toString() === String(caseId)) : docs).map((d) => (
              <div key={d.id} className="rounded-xl border border-default bg-card-secondary p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{d.title || d.original_name || 'Document'}</p>
                    <p className="mt-1 text-xs text-muted-fg">
                      {String(d.category || 'general').replaceAll('_', ' ')} · {formatBytes(d.size_bytes)} ·{' '}
                      {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                    </p>
                    <p className="mt-1 text-xs text-muted-fg">
                      {t('Uploaded by')}: {d.uploaded_by_name || '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => downloadDoc(d)}>
                      Download
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openPreview(d)}>
                      Preview
                    </Button>
                  </div>
                </div>
                {d.notes ? <p className="mt-2 text-sm text-fg-secondary">{d.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {preview.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-4xl !bg-card !shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Preview</CardTitle>
                <p className="mt-1 text-sm text-muted-fg truncate">{preview.name}</p>
              </div>
              <Button variant="ghost" onClick={closePreview}>
                Close
              </Button>
            </div>
            <div className="mt-4 h-[70vh] overflow-hidden rounded-xl border border-default bg-black/5">
              {String(preview.mime).toLowerCase().startsWith('image/') ? (
                <img src={preview.url} alt={preview.name} className="h-full w-full object-contain" />
              ) : (
                <iframe title="PDF Preview" src={preview.url} className="h-full w-full" />
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
