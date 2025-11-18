import { FaComments, FaQrcode, FaClipboardList, FaBell, FaUserNurse, FaChartLine } from 'react-icons/fa';

function Services() {
  const services = [
    {
      icon: <FaComments className="text-5xl text-primary" />,
      title: "AI Health Chatbot",
      description: "Get instant answers to your health questions. Our chatbot can help with common symptoms like fever, cough, headache, and dehydration. Available 24/7 on your mobile device.",
      features: [
        "Symptom analysis",
        "Health advice for common ailments",
        "Escalation to ASHA workers when needed",
        "WhatsApp-like interface"
      ]
    },
    {
      icon: <FaQrcode className="text-5xl text-secondary" />,
      title: "Digital Health Card",
      description: "Carry your health information wherever you go with our QR-based digital health card. Easy to share with healthcare providers.",
      features: [
        "Instant QR code generation",
        "Secure health data storage",
        "Easy scanning and access",
        "Mobile-friendly display"
      ]
    },
    {
      icon: <FaClipboardList className="text-5xl text-accent" />,
      title: "Health Records Management",
      description: "Maintain a complete digital record of your health history, vitals, and medical notes accessible anytime.",
      features: [
        "Store vitals and health data",
        "Access records on any device",
        "History tracking",
        "Secure cloud storage"
      ]
    },
    {
      icon: <FaBell className="text-5xl text-green-600" />,
      title: "Notification System",
      description: "Stay updated with timely notifications about your health records, appointments, and important health alerts.",
      features: [
        "Real-time notifications",
        "Health record updates",
        "Appointment reminders",
        "Emergency alerts"
      ]
    },
    {
      icon: <FaUserNurse className="text-5xl text-purple-600" />,
      title: "ASHA Worker Support",
      description: "Connect directly with ASHA workers who can update your records, monitor your health, and provide personalized guidance.",
      features: [
        "Direct communication",
        "Case flagging for urgent issues",
        "Health monitoring",
        "Personalized care"
      ]
    },
    {
      icon: <FaChartLine className="text-5xl text-blue-600" />,
      title: "Health Tracking",
      description: "Track your health metrics over time and identify patterns with comprehensive health analytics.",
      features: [
        "Vital signs tracking",
        "Health trends analysis",
        "Progress monitoring",
        "Data visualization"
      ]
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-800">
          Our Services
        </h1>
        <p className="text-center text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Comprehensive healthcare solutions designed specifically for rural communities
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="card hover:shadow-xl transition-shadow">
              <div className="mb-4">
                {service.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">
                {service.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-primary to-green-600 rounded-lg p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Access These Services?
          </h2>
          <p className="text-lg mb-6 text-green-100">
            Create your account today and start managing your health digitally
          </p>
          <a
            href="/register"
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg hover:bg-green-100 transition font-semibold text-lg"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </div>
  );
}

export default Services;
