import dotenv from 'dotenv';
dotenv.config();           // MUST come first

import './config/firebase.js';     // initialize Firebase after .env
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './config/database.js';
import usersRouter from './routes/users.js';
import healthRouter from './routes/health.js';
import flagRouter from './routes/flag.js';
import qrRouter from './routes/qr.js';
import notificationsRouter from './routes/notifications.js';
import villagerProfileRouter from './routes/villagerProfile.js';
import chatbotRouter from './routes/chatbot.js';
import villagesRouter from './routes/villages.js';
import medicineRouter from './routes/medicine.js';
import visitsRouter from './routes/visits.js';
import doctorRouter from './routes/doctor.js';
import historyRouter from './routes/history.js';
import documentsRouter from './routes/documents.js';
import casesRouter from './routes/cases.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/health', healthRouter);
app.use('/api/flag', flagRouter);
app.use('/api/qr', qrRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/villager-profile', villagerProfileRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/villages', villagesRouter);
app.use('/api/medicine', medicineRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/history', historyRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/cases', casesRouter);

app.get('/api', (req, res) => {
  res.json({ message: 'Rural Healthcare API is running' });
});

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
