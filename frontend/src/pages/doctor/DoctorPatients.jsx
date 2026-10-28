import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FaBrain, FaUsers } from 'react-icons/fa';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { doctorAPI, villageAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import RiskScoreBar from './RiskScoreBar';
import { resolveRiskScore } from './doctorUtils';

export default function DoctorPatients() {
  const { userProfile } = useOutletContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [villages, setVillages] = useState([]);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState(null);

  useDoctorPageMeta({ title: 'Patients', subtitle: 'Search and review patient records' });

  useEffect(() => {
    villageAPI.getAll().then((r) => setVillages(r.data || [])).catch(() => setVillages([]));
  }, []);

  useEffect(() => {
    if (!userProfile?.id) return;
    loadPatients();
  }, [userProfile?.id, search, villageFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    doctorAPI
      .getPatientDetails(selectedId)
      .then((r) => setDetails(r.data))
      .catch(() => setDetails(null));
  }, [selectedId]);

  const loadPatients = async () => {
    try {
      const res = await doctorAPI.searchPatients({
        search: search || undefined,
        villageId: villageFilter || undefined,
      });
      setPatients(res.data || []);
    } catch (e) {
      console.error(e);
      setPatients([]);
    }
  };

  if (!userProfile) return <DashboardSkeleton />;

  return (
    <div className="page-container dashboard-stack">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaUsers className="text-brand-500" />
              Patient Search
            </CardTitle>
          </CardHeader>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Name or patient ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input-field"
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
            >
              <option value="">All villages</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>
          </div>
          {patients.length === 0 ? (
            <EmptyState title="No patients found" description="Adjust search or village filter." />
          ) : (
            <div className="max-h-[520px] space-y-2 overflow-y-auto scrollbar-thin">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(String(p.id))}
                  className={`list-item w-full text-left ${selectedId === String(p.id) ? 'ring-2 ring-brand-500/40' : ''}`}
                >
                  <p className="font-medium text-fg">{p.name}</p>
                  <p className="text-xs text-muted-fg">
                    ID {p.id} · {p.village_name || '—'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Patient summary</CardTitle>
          </CardHeader>
          {!selectedId || !details?.patient ? (
            <EmptyState
              icon={FaUsers}
              title="Select a patient"
              description="Choose a patient from the list to view vitals, AI summaries, and history."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-default bg-card-secondary p-4">
                <p className="text-lg font-semibold text-fg">{details.patient.name}</p>
                <p className="text-sm text-muted-fg">
                  {details.patient.village_name || '—'} · Age {details.patient.age || '—'}
                </p>
                <Button className="mt-3" size="sm" onClick={() => navigate(`/patient/${selectedId}`)}>
                  Open full profile
                </Button>
              </div>

              {details.chatSessions?.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                    <FaBrain className="text-brand-500" /> AI chat summaries
                  </p>
                  <div className="space-y-2">
                    {details.chatSessions.slice(0, 5).map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-default bg-card p-3"
                      >
                        <p className="font-medium text-fg">{s.session_title}</p>
                        <RiskScoreBar score={resolveRiskScore(s)} className="mt-2" />
                        <p className="mt-1 text-xs text-muted-fg">
                          {s.triage_status || s.current_severity || '—'} ·{' '}
                          {new Date(s.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-fg">Recent health records</p>
                {details.healthHistory?.length ? (
                  <div className="space-y-2">
                    {details.healthHistory.slice(0, 4).map((hr) => (
                      <div
                        key={hr.id}
                        className="rounded-lg border border-default bg-card-secondary px-3 py-2 text-sm"
                      >
                        <p className="text-fg-secondary">{hr.symptoms || hr.notes || 'Visit recorded'}</p>
                        <p className="text-xs text-muted-fg">
                          {new Date(hr.created_at || hr.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-fg">No health records yet.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
