import { useMemo, useState } from 'react';
import {
  FaChevronRight,
  FaDownload,
  FaFlask,
  FaHeartbeat,
  FaPrint,
  FaStethoscope,
  FaSyringe,
  FaTimes,
  FaPills,
  FaFileMedical,
  FaPlusCircle,
} from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import VillagerSectionHeader from './VillagerSectionHeader';
import VillagerFilterTabs from './VillagerFilterTabs';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { documentAPI } from '../../services/api';
import { translateStatus } from '../../utils/i18nHealthcare';

const FILTERS = [
  { id: 'all', labelKey: 'All Records' },
  { id: 'visits', labelKey: 'Visits' },
  { id: 'medications', labelKey: 'Medications' },
  { id: 'lab', labelKey: 'Lab Reports' },
  { id: 'vaccinations', labelKey: 'Vaccinations' },
];

function getRecordCategory(record) {
  const notes = `${record.notes || ''} ${record.symptoms || ''}`.toLowerCase();
  if (notes.includes('vaccin') || notes.includes('immuniz')) return 'vaccinations';
  if (notes.includes('lab') || notes.includes('test report') || notes.includes('blood test')) return 'lab';
  if (record.medicines_given && !record.symptoms) return 'medications';
  return 'visits';
}

function getRecordIcon(category) {
  const map = {
    visits: FaStethoscope,
    medications: FaPills,
    lab: FaFlask,
    vaccinations: FaSyringe,
  };
  return map[category] || FaHeartbeat;
}

function getHealthStatus(record) {
  const text = `${record.symptoms || ''} ${record.notes || ''}`.toLowerCase();
  if (text.match(/chest pain|breathing|severe|unconscious|blood/)) return 'critical';
  if (text.match(/fever|vomit|vomiting|diarrhea|body pain/)) return 'moderate';
  return 'normal';
}

export default function VillagerHealthRecords({
  records,
  documents = [],
  prescriptions = [],
  cases = [],
  loading,
  userProfile,
  onExportPdf,
  recordRefs,
  onAddRecord,
  onUploadDocument,
  allowCareActions = false,
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [previewDoc, setPreviewDoc] = useState({ open: false, url: '', mime: '', name: '' });
  const [docFeedback, setDocFeedback] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((r) => getRecordCategory(r) === filter);
  }, [records, filter]);

  const visibleDocuments = useMemo(() => {
    if (filter === 'all' || filter === 'lab') return documents;
    return [];
  }, [documents, filter]);

  const visiblePrescriptions = useMemo(() => {
    if (filter === 'all' || filter === 'medications') return prescriptions;
    return [];
  }, [prescriptions, filter]);

  const caseLabel = (caseId) => {
    if (!caseId) return null;
    const item = cases.find((c) => String(c.id) === String(caseId));
    return item?.escalation_reason || t('caseNumber', { caseId });
  };

  const filterTabs = FILTERS.map((f) => ({
    id: f.id,
    label: t(f.labelKey),
    count:
      f.id === 'all'
        ? records.length + documents.length + prescriptions.length
        : f.id === 'lab'
        ? records.filter((r) => getRecordCategory(r) === f.id).length + documents.length
        : f.id === 'medications'
        ? records.filter((r) => getRecordCategory(r) === f.id).length + prescriptions.length
        : records.filter((r) => getRecordCategory(r) === f.id).length,
  }));

  const showDocFeedback = (message) => {
    setDocFeedback(message);
    setTimeout(() => setDocFeedback(''), 2500);
  };

  const buildBlobUrl = (blob) => {
    try {
      return URL.createObjectURL(blob);
    } catch {
      return '';
    }
  };

  const isPreviewable = (mime) => {
    const value = String(mime || '').toLowerCase();
    return value.startsWith('image/') || value === 'application/pdf';
  };

  const downloadDocument = async (doc) => {
    try {
      const res = await documentAPI.download(doc.id);
      const blob = new Blob([res.data], { type: doc.mime_type || 'application/octet-stream' });
      const url = buildBlobUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_name || doc.title || 'medical_document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showDocFeedback('Download failed.');
    }
  };

  const previewDocument = async (doc) => {
    if (!isPreviewable(doc.mime_type)) {
      showDocFeedback('Preview not available. Please download this file.');
      return;
    }
    try {
      const res = await documentAPI.download(doc.id);
      const blob = new Blob([res.data], { type: doc.mime_type || 'application/octet-stream' });
      const url = buildBlobUrl(blob);
      setPreviewDoc({
        open: true,
        url,
        mime: doc.mime_type || '',
        name: doc.original_name || doc.title || 'Medical document',
      });
    } catch (error) {
      console.error(error);
      showDocFeedback('Preview failed.');
    }
  };

  const closePreviewDocument = () => {
    if (previewDoc.url) URL.revokeObjectURL(previewDoc.url);
    setPreviewDoc({ open: false, url: '', mime: '', name: '' });
  };

  if (loading) {
    return (
      <div className="villager-screen">
        <VillagerSectionHeader title={t('Health Records')} subtitle={t('Your medical history at a glance')} />
        <p className="py-12 text-center text-sm text-muted-fg animate-pulse">{t('Loading records...')}</p>
      </div>
    );
  }

  return (
    <div className="villager-screen">
      <VillagerSectionHeader
        title={t('Health Records')}
        subtitle={t('Your medical history at a glance')}
      />

      {allowCareActions && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onAddRecord}>
            <FaPlusCircle /> Add Health Record
          </Button>
          <Button size="sm" variant="secondary" onClick={onUploadDocument}>
            <FaFileMedical /> Upload Document
          </Button>
        </div>
      )}

      <VillagerFilterTabs tabs={filterTabs} active={filter} onChange={setFilter} />

      {docFeedback ? (
        <div className="mb-3 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {docFeedback}
        </div>
      ) : null}

      {filtered.length === 0 && visibleDocuments.length === 0 && visiblePrescriptions.length === 0 ? (
        <EmptyState
          icon={FaHeartbeat}
          title={t('No health records yet')}
          description={t('Your ASHA worker will add records after your health checkup')}
        />
      ) : (
        <div className="villager-record-list">
          {visiblePrescriptions.map((rx) => (
            <article key={`rx-${rx.id}`} className="villager-record-list-card">
              <div className="villager-record-list-icon">
                <FaPills className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="villager-record-list-title">
                  {rx.case_id
                    ? t('prescriptionForCase', { caseId: rx.case_id })
                    : t('prescriptionGeneric')}
                </h3>
                <p className="villager-record-list-desc line-clamp-2">
                  {rx.medicine_name}
                  {rx.dosage ? ` · ${rx.dosage}` : ''}
                  {rx.duration ? ` · ${rx.duration}` : ''}
                </p>
                <p className="villager-record-list-meta">
                  {t('doctorName', { name: rx.doctor_name || 'Doctor' })} ·{' '}
                  {rx.created_at || rx.date ? new Date(rx.created_at || rx.date).toLocaleDateString() : '—'}
                  {rx.case_id ? ` · ${caseLabel(rx.case_id) || t('caseNumber', { caseId: rx.case_id })}` : ''}
                </p>
                {rx.instructions || rx.doctor_notes ? (
                  <p className="mt-1 text-xs text-muted-fg line-clamp-2">
                    {rx.instructions || rx.doctor_notes}
                  </p>
                ) : null}
              </div>
            </article>
          ))}

          {visibleDocuments.map((doc) => (
            <article key={`doc-${doc.id}`} className="villager-record-list-card">
              <div className="villager-record-list-icon">
                <FaFlask className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="villager-record-list-title">{doc.title || doc.original_name || t('Lab Report')}</h3>
                <p className="villager-record-list-desc line-clamp-2">
                  {doc.notes || String(doc.category || 'medical document').replaceAll('_', ' ')}
                </p>
                <p className="villager-record-list-meta">
                  {String(doc.category || 'report').replaceAll('_', ' ')} ·{' '}
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'} · {t('Uploaded by')}{' '}
                  {doc.uploaded_by_name || 'care team'}
                  {doc.case_id ? ` · ${t('caseNumber', { caseId: doc.case_id })}` : ''}
                </p>
                {doc.case_id && caseLabel(doc.case_id) ? (
                  <p className="mt-1 text-xs text-muted-fg line-clamp-1">{caseLabel(doc.case_id)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => previewDocument(doc)}>
                  {t('View Details')}
                </Button>
                <Button size="sm" onClick={() => downloadDocument(doc)}>
                  <FaDownload /> {t('Download')}
                </Button>
              </div>
            </article>
          ))}

          {filtered.map((record) => {
            const category = getRecordCategory(record);
            const Icon = getRecordIcon(category);
            const date = new Date(record.created_at || record.date);
            const title =
              record.visit_type === 'doctor_visit' || record.doctor_id || record.diagnosis
                ? t('Doctor Consultation Notes')
                : record.symptoms?.split(',')[0]?.trim() ||
                  (category === 'medications' ? t('Medication Record') : t('Health Visit'));
            const desc =
              record.medicines_given ||
              record.notes ||
              record.visit_type ||
              t('Rural Health visit record');

            return (
              <article key={record.id} className="villager-record-list-card">
                <div className="villager-record-list-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="villager-record-list-title">{title}</h3>
                  <p className="villager-record-list-desc line-clamp-2">{desc}</p>
                  <p className="villager-record-list-meta">
                    {record.doctor_name ? t('doctorName', { name: record.doctor_name }) : record.asha_name || record.visit_type || t('ASHA / Clinic')} · {date.toLocaleDateString()}
                    {record.case_id ? ` · ${t('caseNumber', { caseId: record.case_id })}` : ''}
                  </p>
                  {record.case_id && caseLabel(record.case_id) ? (
                    <p className="mt-1 text-xs text-muted-fg line-clamp-1">{caseLabel(record.case_id)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(record)}
                  className="villager-record-list-action"
                >
                  {t('View Details')}
                  <FaChevronRight className="h-3 w-3" />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {previewDoc.open && (
        <div className="villager-modal-backdrop" onClick={closePreviewDocument}>
          <div
            className="villager-modal max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="villager-modal-head">
              <div className="min-w-0">
                <h3>{t('Lab Report')}</h3>
                <p className="mt-1 truncate text-sm text-muted-fg">{previewDoc.name}</p>
              </div>
              <button type="button" onClick={closePreviewDocument} className="villager-modal-close">
                <FaTimes />
              </button>
            </div>
            <div className="h-[70vh] overflow-hidden rounded-xl border border-default bg-black/5">
              {String(previewDoc.mime).toLowerCase().startsWith('image/') ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="h-full w-full object-contain" />
              ) : (
                <iframe title="Lab report preview" src={previewDoc.url} className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="villager-modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="villager-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="villager-modal-head">
              <h3>{t('Record Details')}</h3>
              <button type="button" onClick={() => setSelected(null)} className="villager-modal-close">
                <FaTimes />
              </button>
            </div>
            <div
              ref={(el) => { recordRefs.current[selected.id] = el; }}
              className="villager-modal-body"
            >
              {(() => {
                const status = getHealthStatus(selected);
                const vitals = selected.vitals || {};
                const date = new Date(selected.created_at || selected.date);
                return (
                  <>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-fg">Rural Health Prescription</h4>
                        <p className="mt-1 text-xs text-muted-fg">
                          {date.toLocaleDateString()} · {date.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status}>{status.toUpperCase()}</Badge>
                        <QRCodeCanvas
                          value={JSON.stringify({
                            type: 'RHA_HEALTH_RECORD',
                            record_id: selected.id,
                            patient_id: userProfile.id,
                          })}
                          size={48}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="villager-record-mini">
                        <p className="villager-record-label">Patient</p>
                        <p className="font-medium">{userProfile.name}</p>
                      </div>
                      <div className="villager-record-mini">
                        <p className="villager-record-label">Visit</p>
                        <p className="font-medium">{selected.visit_type || 'home_visit'}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ['Temp', vitals.temperature || selected.temperature],
                        ['BP', vitals.blood_pressure || selected.blood_pressure],
                        ['Pulse', vitals.pulse],
                        ['Weight', vitals.weight],
                      ].map(([label, val]) => (
                        <div key={label} className="villager-vital-pill">
                          <p className="villager-record-label">{label}</p>
                          <p className="font-semibold">{val || '—'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-fg-secondary">Symptoms</p>
                        <p className="mt-1">{selected.symptoms || '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-fg-secondary">Medicines</p>
                        <p className="mt-1">{selected.medicines_given || '—'}</p>
                      </div>
                      {selected.notes && (
                        <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
                          <p className="font-medium text-amber-800 dark:text-amber-300">Notes</p>
                          <p className="mt-1">{selected.notes}</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="villager-modal-foot">
              <Button variant="ghost" size="sm" onClick={() => onExportPdf(selected, 'print')}>
                <FaPrint /> {t('Print')}
              </Button>
              <Button size="sm" onClick={() => onExportPdf(selected, 'download')}>
                <FaDownload /> PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
