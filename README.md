# Rural Healthcare Assistance Web App

A fully responsive web application for rural healthcare, built with React.js, Tailwind CSS, Node.js, Firebase Authentication, and PostgreSQL (NeonDB).

## Features (50% Implementation)

### ✅ Implemented Features

1. **AI Chatbot**
   - Mobile-friendly WhatsApp-like UI
   - Symptom analysis for fever, cough, headache, dehydration
   - Automatic escalation to ASHA workers for severe cases

2. **User Authentication (Firebase)**
   - Secure login and registration
   - Three user roles: Villager, ASHA Worker, Doctor
   - Role-based dashboard routing

3. **QR Digital Health Card**
   - Generate QR codes for health information
   - Download and share functionality
   - Mobile-responsive display

4. **Database Integration (PostgreSQL)**
   - Users management
   - Health records storage
   - Flagged cases tracking
   - Notifications system
   - QR codes storage

5. **ASHA Worker Dashboard**
   - Add health records for villagers
   - Flag cases for doctor review
   - View all flagged cases
   - Mobile-first design

6. **Villager Dashboard**
   - Access AI chatbot
   - View health records
   - Display QR health card
   - Receive notifications

7. **Doctor Dashboard**
   - View patient statistics (demo data)
   - Appointment management (demo)
   - Patient overview (demo)

8. **Notification System**
   - Real-time notifications
   - Mark as read functionality
   - Database-backed storage

9. **Responsive Pages**
   - Home, About, Services, Contact, 404
   - Fully mobile-responsive
   - Hamburger menu navigation

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Authentication**: Firebase Auth
- **Database**: PostgreSQL (NeonDB)
- **Other**: QR Code generation, Axios

## Project Structure

```
rural-healthcare-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   ├── QRCard.jsx
│   │   │   └── NotificationPanel.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── VillagerDashboard.jsx
│   │   │   ├── ASHADashboard.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── firebase.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── firebase.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── users.js
│   │   │   ├── health.js
│   │   │   ├── flag.js
│   │   │   ├── qr.js
│   │   │   └── notifications.js
│   │   └── server.js
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL database (NeonDB)
- Firebase project

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create `.env` file based on `.env.example`:
```env
PORT=3000
DATABASE_URL=your_neondb_connection_string
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

3. Install dependencies:
```bash
npm install
```

4. Start backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Create `.env` file based on `.env.example`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3000
```

3. Install dependencies:
```bash
npm install
```

4. Start frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5000`

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Email/Password authentication
4. Get your Firebase config credentials
5. For backend, download the service account JSON from Project Settings > Service Accounts
6. Add the credentials to your `.env` files

### Database Setup

The database tables will be created automatically when the backend server starts. The following tables are created:

- **users**: User information and roles
- **health_records**: Patient vitals and health data
- **flagged_cases**: Cases requiring attention
- **notifications**: User notifications
- **qrcodes**: QR code data for health cards

## Usage

### For Villagers

1. Register with role "Villager"
2. Access the chatbot for health advice
3. View your health records added by ASHA workers
4. Generate and download your QR health card
5. Receive notifications

### For ASHA Workers

1. Register with role "ASHA Worker"
2. Add health records for villagers
3. Flag cases that need doctor attention
4. View all flagged cases
5. Monitor patient health

### For Doctors

1. Register with role "Doctor"
2. View dashboard with patient statistics (demo)
3. See appointment schedule (demo)
4. Review patient information (demo)

## API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/:userId` - Get user by ID

### Health Records
- `POST /api/health/add` - Add health record
- `GET /api/health/:userId` - Get health records for user

### Flagged Cases
- `POST /api/flag/:userId` - Flag a case
- `GET /api/flag/all` - Get all flagged cases

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `GET /api/qr/:userId` - Get QR code

### Notifications
- `GET /api/notifications/:userId` - Get notifications
- `PUT /api/notifications/:notificationId/read` - Mark as read

## Responsive Design

The application is fully responsive with breakpoints:
- Mobile: 360px+
- Tablet: 768px+ (md)
- Desktop: 1024px+ (lg)

All components use Tailwind CSS for responsive design with mobile-first approach.

## Future Enhancements (Next 50%)

- Video consultation with doctors
- Medication reminders
- Appointment scheduling
- Medical report uploads
- Multi-language support
- Offline mode support
- SMS notifications
- Advanced analytics for ASHA workers
- Doctor prescription system
- Integration with government health schemes

## License

This project is developed for educational purposes.

## Support

For issues or questions, please contact support@ruralhealthcare.org
