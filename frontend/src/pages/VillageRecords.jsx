import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, villageAPI } from '../services/api';

function VillageRecords() {
  const navigate = useNavigate();
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [stats, setStats] = useState(null);
  const [villagers, setVillagers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const response = await villageAPI.getAssigned();
      setVillages(response.data || []);
      if (response.data?.length) setSelectedVillage(String(response.data[0].id));
    };
    load().catch(() => setVillages([]));
  }, []);

  useEffect(() => {
    if (!selectedVillage) return;
    const loadVillageData = async () => {
      const [statsRes, villagersRes] = await Promise.all([
        villageAPI.getRecords(selectedVillage),
        userAPI.getVillageUsers(selectedVillage)
      ]);
      setStats(statsRes.data);
      setVillagers((villagersRes.data || []).filter((u) => u.role === 'Villager'));
    };
    loadVillageData().catch(() => {
      setStats(null);
      setVillagers([]);
    });
  }, [selectedVillage]);

  return (
    <div className="page-container">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="card">
          <h1 className="text-2xl font-bold mb-3">Village Records</h1>
          <select
            className="input-field max-w-md"
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
          >
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.village_name}
              </option>
            ))}
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="card"><p className="text-xs text-gray-500">Total Villagers</p><p className="text-2xl font-bold">{stats.total_villagers}</p></div>
            <div className="card"><p className="text-xs text-gray-500">Children</p><p className="text-2xl font-bold">{stats.children}</p></div>
            <div className="card"><p className="text-xs text-gray-500">Pregnant Women</p><p className="text-2xl font-bold">{stats.pregnant_women}</p></div>
            <div className="card"><p className="text-xs text-gray-500">Elderly</p><p className="text-2xl font-bold">{stats.elderly_patients}</p></div>
            <div className="card"><p className="text-xs text-gray-500">Recent Cases</p><p className="text-2xl font-bold">{stats.recent_health_cases?.length || 0}</p></div>
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Villagers</h2>
          {villagers.length === 0 ? <p className="text-gray-500">No villagers in this village.</p> : (
            <div className="space-y-2">
              {villagers.map((villager) => (
                <button
                  key={villager.id}
                  onClick={() => navigate(`/patient/${villager.id}`)}
                  className="list-item"
                >
                  <p className="font-medium">{villager.name}</p>
                  <p className="text-xs text-gray-500">Age: {villager.age || '-'} | Phone: {villager.phone || '-'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VillageRecords;
