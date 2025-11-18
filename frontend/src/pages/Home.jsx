import { Link } from 'react-router-dom';
import { FaUserMd, FaHeartbeat, FaQrcode, FaComments } from 'react-icons/fa';

function Home() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-primary to-green-600 text-white py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Rural Healthcare Assistance
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Bringing quality healthcare to rural communities through technology, connecting villagers with healthcare workers and doctors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary px-8 py-3 rounded-lg hover:bg-green-100 transition font-semibold text-lg"
            >
              Get Started
            </Link>
            <Link
              to="/about"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-primary transition font-semibold text-lg"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Our Features
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center hover:shadow-xl transition">
              <FaComments className="text-5xl text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">AI Chatbot</h3>
              <p className="text-gray-600">
                Get instant health advice for common symptoms like fever, cough, and headaches.
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaHeartbeat className="text-5xl text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Health Records</h3>
              <p className="text-gray-600">
                Store and access your health records digitally anytime, anywhere.
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaQrcode className="text-5xl text-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Digital Health Card</h3>
              <p className="text-gray-600">
                Carry your health information in a convenient QR code format.
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaUserMd className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">ASHA Support</h3>
              <p className="text-gray-600">
                Connect with ASHA workers for personalized healthcare guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of villagers already using our platform for better healthcare access.
          </p>
          <Link
            to="/register"
            className="btn-primary inline-block"
          >
            Register Now
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
