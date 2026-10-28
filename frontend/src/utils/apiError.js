/**
 * Extract a user-friendly message from axios/API errors.
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (error?.message === 'INVALID_PATIENT') return 'Please enter a valid Patient ID.';
  if (error?.message === 'INVALID_MED') return 'Please enter a medicine name.';
  if (error?.message === 'INVALID_QTY') return 'Quantity must be at least 1.';
  if (error?.message === 'INVALID_FILE') return 'Please choose a file to upload.';
  if (error?.message === 'FILE_TOO_LARGE') return 'File is too large. Maximum size is 15 MB.';
  if (error?.message === 'UNSUPPORTED_FILE') return 'This file type is not supported. Use PDF or images.';

  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error && typeof data.error === 'string') return data.error;
  if (data?.message && typeof data.message === 'string') return data.message;

  if (error?.code === 'ERR_NETWORK') {
    return 'Network error. Check your connection and try again.';
  }

  return fallback;
}
