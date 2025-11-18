import admin from 'firebase-admin';

let firebaseInitialized = false;

try {
  const hasCredentials = process.env.FIREBASE_PROJECT_ID && 
                        process.env.FIREBASE_PRIVATE_KEY && 
                        process.env.FIREBASE_CLIENT_EMAIL;

  if (hasCredentials && !admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.warn('⚠️  Firebase credentials not configured. Authentication routes will not work.');
    console.warn('   Please add FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL to .env');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
}

export const verifyToken = async (token) => {
  if (!firebaseInitialized) {
    throw new Error('Firebase not configured');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export { firebaseInitialized };
export default admin;
