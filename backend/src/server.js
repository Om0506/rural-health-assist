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
