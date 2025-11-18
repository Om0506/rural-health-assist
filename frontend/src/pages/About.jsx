import { FaHandHoldingHeart, FaBullseye, FaUsers } from 'react-icons/fa';

function About() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-gray-800">
          About Us
        </h1>

        <div className="max-w-4xl mx-auto mb-12">
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            The Rural Healthcare Assistance platform was created to bridge the healthcare gap in rural communities. We understand that access to quality healthcare is a fundamental right, yet many rural areas face significant challenges in obtaining medical services.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Our mission is to leverage technology to connect villagers with healthcare workers, provide instant health guidance through AI, and maintain digital health records that are accessible anytime, anywhere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="card text-center">
            <FaHandHoldingHeart className="text-6xl text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">Our Mission</h3>
            <p className="text-gray-600">
              To provide accessible, affordable, and quality healthcare services to rural communities through innovative technology solutions.
            </p>
          </div>

          <div className="card text-center">
            <FaBullseye className="text-6xl text-secondary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">Our Vision</h3>
            <p className="text-gray-600">
              A future where every individual in rural areas has equal access to healthcare information and services, regardless of location.
            </p>
          </div>

          <div className="card text-center">
            <FaUsers className="text-6xl text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">Our Community</h3>
            <p className="text-gray-600">
              Building a network of villagers, ASHA workers, and doctors working together for better health outcomes.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary to-green-600 text-white rounded-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">Mobile-First Design</h4>
                <p className="text-green-100">Optimized for smartphones used in rural areas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">AI-Powered Assistance</h4>
                <p className="text-green-100">Instant health advice for common ailments</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">Digital Health Cards</h4>
                <p className="text-green-100">QR-based easy access to health information</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">ASHA Worker Integration</h4>
                <p className="text-green-100">Direct connection to healthcare workers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
