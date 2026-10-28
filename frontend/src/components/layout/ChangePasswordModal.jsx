import { useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../utils/firebase';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ChangePasswordModal({ open, onClose, userEmail, hasPasswordProvider }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser?.email) {
      setError('No email on this account.');
      return;
    }

    setLoading(true);
    try {
      if (hasPasswordProvider) {
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
        setSuccess('Password updated successfully.');
        setTimeout(handleClose, 1200);
      } else if (userEmail) {
        await sendPasswordResetEmail(auth, userEmail);
        setSuccess('Reset link sent to your email. Use it to set a new password.');
      }
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/requires-recent-login') {
        setError('Please log out and log in again, then try changing your password.');
      } else {
        setError('Could not update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    if (!userEmail) {
      setError('No email on this account.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setSuccess('Password reset email sent. Check your inbox.');
    } catch {
      setError('Could not send reset email. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-dark-card" role="dialog" aria-labelledby="change-password-title">
        <h2 id="change-password-title" className="text-lg font-semibold text-fg">
          Change password
        </h2>
        <p className="mt-1 text-sm text-muted-fg">
          {hasPasswordProvider
            ? 'Enter your current password and choose a new one.'
            : 'We will email you a link to set a new password.'}
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {success}
          </p>
        )}

        {hasPasswordProvider ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="current-password">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="new-password">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Update password
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendReset} loading={loading}>
              Send reset email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
