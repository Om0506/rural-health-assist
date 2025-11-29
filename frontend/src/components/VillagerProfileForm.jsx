import { useEffect, useState } from 'react';
import { villagerProfileAPI } from '../services/api';
import { FaSave } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

const DISEASE_OPTIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart Problems',
  'Thyroid',
  'None'
];

const ALLERGY_OPTIONS = [
  'Medicine Allergy',
  'Food Allergy',
  'Dust/Pollen Allergy',
  'None'
];

const INITIAL_FORM = {
  fullName: '',
  age: '',
  gender: '',
  phoneNumber: '',
  address: '',
  villageName: '',
  emergencyContact: '',
  familyId: '',
  heightCm: '',
  weightKg: '',
  bpSystolic: '',
  bpDiastolic: '',
  heartRate: '',
  bodyTemperature: '',
  bloodSugar: '',
  oxygenLevel: '',
  existingDiseases: [],
  allergies: [],
  pastSurgeries: '',
  isSmoker: false,
  alcoholConsumption: 'None',
  activityLevel: 'Low',
  eatingPattern: 'Regular',
  covidVaccinationStatus: 'None',
  tetanusVaccineDate: '',
  otherVaccinations: ''
};

function VillagerProfileForm({ userProfile }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (userProfile) {
      loadProfile();
    }
  }, [userProfile]);

  const loadProfile = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await villagerProfileAPI.getMine();
      const profile = response.data;

      setFormData({
        ...INITIAL_FORM,
        ...profile,
        age: profile.age ?? '',
        phoneNumber: profile.phoneNumber ?? userProfile.phone ?? '',
        fullName: profile.fullName ?? userProfile.name ?? '',
        existingDiseases: profile.existingDiseases ?? [],
        allergies: profile.allergies ?? [],
        isSmoker: profile.isSmoker ?? false,
        tetanusVaccineDate: profile.tetanusVaccineDate
          ? profile.tetanusVaccineDate.slice(0, 10)
          : ''
      });
    } catch (error) {
      console.log('No villager profile found yet. User can create one.');
      setFormData((prev) => ({
        ...prev,
        fullName: userProfile?.name || '',
        age: userProfile?.age || '',
        phoneNumber: userProfile?.phone || ''
      }));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleMultiSelect = (field, value) => {
    setFormData((prev) => {
      const current = new Set(prev[field] || []);

      if (value === 'None') {
        return {
          ...prev,
          [field]: current.has('None') ? [] : ['None']
        };
      }

      current.delete('None');

      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }

      return {
        ...prev,
        [field]: Array.from(current)
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      await villagerProfileAPI.saveMine({
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        heightCm: formData.heightCm ? Number(formData.heightCm) : null,
        weightKg: formData.weightKg ? Number(formData.weightKg) : null,
        bpSystolic: formData.bpSystolic ? Number(formData.bpSystolic) : null,
        bpDiastolic: formData.bpDiastolic ? Number(formData.bpDiastolic) : null,
        heartRate: formData.heartRate ? Number(formData.heartRate) : null,
        bodyTemperature: formData.bodyTemperature ? Number(formData.bodyTemperature) : null,
        bloodSugar: formData.bloodSugar ? Number(formData.bloodSugar) : null,
        oxygenLevel: formData.oxygenLevel ? Number(formData.oxygenLevel) : null
      });

      setStatus({ type: 'success', message: t('Villager information saved successfully.') });
      await loadProfile();
    } catch (error) {
      console.error('Failed to save villager profile:', error);
      setStatus({
        type: 'error',
        message: error?.response?.data?.error || t('Failed to save villager information.')
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCheckboxGroup = (label, field, options) => (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-md border">
            <input
              type="checkbox"
              className="rounded text-primary focus:ring-primary"
              checked={formData[field]?.includes(option) || false}
              onChange={() => toggleMultiSelect(field, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="card">
        <p className="text-gray-600">{t('Loading villager information...')}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('Villager Information')}</h2>
        <p className="text-gray-600">
          {t('Keep your details updated so ASHA workers and doctors can provide faster support.')}
        </p>
      </div>

      {status && (
        <div
          className={`mb-4 px-4 py-3 rounded ${
            status.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('1. Basic Personal Details')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Full Name *')}</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Age')}</label>
              <input
                type="number"
                min="0"
                value={formData.age}
                onChange={(e) => updateField('age', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Gender')}</label>
              <select
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="input-field mt-1"
              >
                <option value="">{t('Select gender')}</option>
                <option value="Male">{t('Male')}</option>
                <option value="Female">{t('Female')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Phone Number')}</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Address / Village Name')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="input-field mt-1"
                placeholder={t('e.g., Main Street, Green Village')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Village Name')}</label>
              <input
                type="text"
                value={formData.villageName}
                onChange={(e) => updateField('villageName', e.target.value)}
                className="input-field mt-1"
                placeholder={t('If different from address')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Emergency Contact Number')}</label>
              <input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => updateField('emergencyContact', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Family ID (optional)')}</label>
              <input
                type="text"
                value={formData.familyId}
                onChange={(e) => updateField('familyId', e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('2. Basic Health Parameters')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Height (cm)')}</label>
              <input
                type="number"
                value={formData.heightCm}
                onChange={(e) => updateField('heightCm', e.target.value)}
                className="input-field mt-1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Weight (kg)')}</label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={(e) => updateField('weightKg', e.target.value)}
                className="input-field mt-1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Heart Rate (bpm)')}</label>
              <input
                type="number"
                value={formData.heartRate}
                onChange={(e) => updateField('heartRate', e.target.value)}
                className="input-field mt-1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Blood Pressure - Systolic')}</label>
              <input
                type="number"
                value={formData.bpSystolic}
                onChange={(e) => updateField('bpSystolic', e.target.value)}
                className="input-field mt-1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Blood Pressure - Diastolic')}</label>
              <input
                type="number"
                value={formData.bpDiastolic}
                onChange={(e) => updateField('bpDiastolic', e.target.value)}
                className="input-field mt-1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Body Temperature (°F)')}</label>
              <input
                type="number"
                step="0.1"
                value={formData.bodyTemperature}
                onChange={(e) => updateField('bodyTemperature', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Blood Sugar (Random)')}</label>
              <input
                type="number"
                value={formData.bloodSugar}
                onChange={(e) => updateField('bloodSugar', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Oxygen Level (SpO₂ %)')}</label>
              <input
                type="number"
                value={formData.oxygenLevel}
                onChange={(e) => updateField('oxygenLevel', e.target.value)}
                className="input-field mt-1"
                min="0"
                max="100"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('3. Medical History')}</h3>
          <div className="space-y-4">
            {renderCheckboxGroup(t('Existing Diseases'), 'existingDiseases', DISEASE_OPTIONS)}
            {renderCheckboxGroup(t('Allergies'), 'allergies', ALLERGY_OPTIONS)}
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Past Surgeries / Major Events')}</label>
              <textarea
                rows="3"
                value={formData.pastSurgeries}
                onChange={(e) => updateField('pastSurgeries', e.target.value)}
                className="input-field mt-1"
                placeholder={t('Optional: Add details')}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('4. Lifestyle Details')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Smoker?')}</label>
              <select
                value={formData.isSmoker ? 'Yes' : 'No'}
                onChange={(e) => updateField('isSmoker', e.target.value === 'Yes')}
                className="input-field mt-1"
              >
                <option value="No">{t('No')}</option>
                <option value="Yes">{t('Yes')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Alcohol Consumption')}</label>
              <select
                value={formData.alcoholConsumption}
                onChange={(e) => updateField('alcoholConsumption', e.target.value)}
                className="input-field mt-1"
              >
                <option value="None">{t('None')}</option>
                <option value="Occasional">{t('Occasional')}</option>
                <option value="Regular">{t('Regular')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Activity Level')}</label>
              <select
                value={formData.activityLevel}
                onChange={(e) => updateField('activityLevel', e.target.value)}
                className="input-field mt-1"
              >
                <option value="Low">{t('Low')}</option>
                <option value="Medium">{t('Medium')}</option>
                <option value="High">{t('High')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Eating Pattern')}</label>
              <select
                value={formData.eatingPattern}
                onChange={(e) => updateField('eatingPattern', e.target.value)}
                className="input-field mt-1"
              >
                <option value="Regular">{t('Regular')}</option>
                <option value="Irregular">{t('Irregular')}</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('5. Vaccination Status')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('COVID Vaccination')}</label>
              <select
                value={formData.covidVaccinationStatus}
                onChange={(e) => updateField('covidVaccinationStatus', e.target.value)}
                className="input-field mt-1"
              >
                <option value="None">{t('None')}</option>
                <option value="One dose">{t('One dose')}</option>
                <option value="Fully vaccinated">{t('Fully vaccinated')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('Tetanus Vaccine Date')}</label>
              <input
                type="date"
                value={formData.tetanusVaccineDate}
                onChange={(e) => updateField('tetanusVaccineDate', e.target.value)}
                className="input-field mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('Other Important Vaccinations')}</label>
              <textarea
                rows="2"
                value={formData.otherVaccinations}
                onChange={(e) => updateField('otherVaccinations', e.target.value)}
                className="input-field mt-1"
                placeholder={t('e.g., Hepatitis, Typhoid, local vaccines')}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <FaSave />
            <span>{saving ? t('Saving...') : t('Save Information')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default VillagerProfileForm;

