import { FaUserMd, FaClipboardList, FaChartLine, FaUsers } from 'react-icons/fa';

function DoctorDashboard({ userProfile }) {
  const dummyStats = {
    totalPatients: 47,
    todayAppointments: 8,
    criticalCases: 3,
    pendingReviews: 12
  };

  const dummyRecentPatients = [
    { id: 1, name: 'Ramesh Kumar', age: 45, condition: 'Diabetes follow-up', status: 'Stable' },
    { id: 2, name: 'Sunita Devi', age: 32, condition: 'Prenatal checkup', status: 'Normal' },
    { id: 3, name: 'Rajesh Singh', age: 58, condition: 'Hypertension', status: 'Monitor' },
    { id: 4, name: 'Lakshmi Bai', age: 41, condition: 'Fever and cough', status: 'Treatment' },
    { id: 5, name: 'Mohan Lal', age: 67, condition: 'Joint pain', status: 'Follow-up' }
  ];

  const dummyAppointments = [
    { id: 1, time: '09:00 AM', patient: 'Priya Sharma', reason: 'General checkup' },
    { id: 2, time: '10:30 AM', patient: 'Vikram Yadav', reason: 'Blood pressure check' },
    { id: 3, time: '11:00 AM', patient: 'Anjali Gupta', reason: 'Vaccination' },
    { id: 4, time: '02:00 PM', patient: 'Suresh Patel', reason: 'Diabetes consultation' }
  ];

  if (!userProfile) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Dr. {userProfile.name}'s Dashboard
          </h1>
          <p className="text-gray-600">Overview of patient care and medical statistics</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-1">Total Patients</p>
                <p className="text-4xl font-bold">{dummyStats.totalPatients}</p>
              </div>
              <FaUsers className="text-5xl text-blue-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 mb-1">Today's Appointments</p>
                <p className="text-4xl font-bold">{dummyStats.todayAppointments}</p>
              </div>
              <FaClipboardList className="text-5xl text-green-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 mb-1">Critical Cases</p>
                <p className="text-4xl font-bold">{dummyStats.criticalCases}</p>
              </div>
              <FaUserMd className="text-5xl text-red-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 mb-1">Pending Reviews</p>
                <p className="text-4xl font-bold">{dummyStats.pendingReviews}</p>
              </div>
              <FaChartLine className="text-5xl text-purple-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center space-x-2">
              <FaClipboardList className="text-primary" />
              <span>Today's Appointments</span>
            </h2>
            <div className="space-y-3">
              {dummyAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-primary text-lg">{apt.time}</span>
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded">Scheduled</span>
                  </div>
                  <p className="font-semibold text-gray-800">{apt.patient}</p>
                  <p className="text-sm text-gray-600">{apt.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center space-x-2">
              <FaUsers className="text-secondary" />
              <span>Recent Patients</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden sm:table-cell">Age</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Condition</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dummyRecentPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{patient.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{patient.age}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{patient.condition}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            patient.status === 'Stable' || patient.status === 'Normal'
                              ? 'bg-green-100 text-green-700'
                              : patient.status === 'Monitor'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 card bg-gradient-to-r from-primary to-green-600 text-white">
          <h3 className="text-2xl font-bold mb-3">Doctor's Note</h3>
          <p className="text-green-100 mb-4">
            This is a demonstration dashboard showing how doctor features will work in the full implementation. 
            The data shown above is sample data for visualization purposes.
          </p>
          <p className="text-green-100">
            In the complete version, this dashboard will include:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-2 text-green-100">
            <li>Real-time patient data and medical records</li>
            <li>Prescription management system</li>
            <li>Integration with diagnostic reports</li>
            <li>Video consultation capabilities</li>
            <li>Medical history tracking and analytics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;
