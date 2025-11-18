# Firebase Setup Guide

This application uses Firebase Authentication for user login and registration. Follow these steps to set up Firebase for your project.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name (e.g., "Rural Healthcare App")
4. Follow the setup wizard (you can disable Google Analytics if you want)
5. Click "Create project"

## Step 2: Enable Email/Password Authentication

1. In your Firebase project, go to **Build** → **Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Click on **Email/Password**
5. Toggle "Enable" to ON
6. Click "Save"

## Step 3: Get Frontend Firebase Configuration

1. In Firebase Console, click the ⚙️ (gear icon) next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the **Web** icon `</>`
5. Register your app with a nickname (e.g., "Rural Healthcare Web")
6. Copy the `firebaseConfig` object

7. Create or update `frontend/.env` file with these values:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3000
```

## Step 4: Get Backend Service Account Credentials

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Go to the **Service accounts** tab
3. Click "Generate new private key"
4. Click "Generate key" - this downloads a JSON file
5. Open the downloaded JSON file

6. Create or update `backend/.env` file with these values from the JSON:

```env
PORT=3000
DATABASE_URL=your_database_url_here
FIREBASE_PROJECT_ID=your_project_id_from_json
FIREBASE_CLIENT_EMAIL=your_client_email_from_json
FIREBASE_PRIVATE_KEY="your_private_key_from_json_with_newlines"
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` should be enclosed in double quotes
- Keep all the `\n` characters in the private key as they are
- Never commit your `.env` files to version control
- Never share your Firebase credentials publicly

## Step 5: Security Rules (Optional but Recommended)

For better security, you can set up Firestore security rules:

1. Go to **Build** → **Firestore Database** (or **Realtime Database**)
2. Click on the **Rules** tab
3. Set appropriate security rules based on your requirements

## Example .env Files

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=rural-healthcare-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rural-healthcare-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=rural-healthcare-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
VITE_API_URL=http://localhost:3000
```

### Backend (.env)
```env
PORT=3000
DATABASE_URL=postgresql://username:password@host/database
FIREBASE_PROJECT_ID=rural-healthcare-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@rural-healthcare-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
```

## Troubleshooting

### "Firebase not configured" error
- Make sure all three Firebase environment variables are set in `backend/.env`
- Check that the private key is properly formatted with quotes and `\n` characters
- Restart the backend server after updating `.env`

### "Invalid credentials" error
- Verify that your Firebase project ID matches in both frontend and backend
- Check that the service account email is correct
- Ensure the private key was copied completely

### Authentication not working
- Make sure Email/Password authentication is enabled in Firebase Console
- Check browser console for specific error messages
- Verify that frontend `.env` variables are correct

## Testing Firebase Setup

After completing the setup:

1. Restart both frontend and backend servers
2. Try to register a new user
3. Check if you can login with the created account
4. Verify that you're redirected to the correct dashboard based on your role

## Security Best Practices

- ✅ Never commit `.env` files to Git
- ✅ Use environment variables for all sensitive data
- ✅ Rotate your credentials periodically
- ✅ Use different Firebase projects for development and production
- ✅ Enable 2FA on your Firebase/Google account
- ✅ Review Firebase security rules regularly

## Need Help?

If you encounter issues:
1. Check the Firebase Console for error logs
2. Review browser console for frontend errors
3. Check backend server logs for API errors
4. Ensure all dependencies are installed (`npm install`)

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs)
