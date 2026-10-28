import { query } from '../config/database.js';

const normalizeRole = (role = '') => {
  if (role === 'ASHA Worker') return 'ASHA';
  return role;
};

export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await query(
        'SELECT role FROM users WHERE firebase_uid = $1',
        [req.user.uid]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userRole = normalizeRole(result.rows[0].role);
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

      if (!normalizedAllowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

export const canAccessUserData = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestedUserId = req.params.userId;
    
    const requestedUserResult = await query(
      'SELECT id FROM users WHERE id = $1',
      [requestedUserId]
    );

    if (requestedUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Requested user not found' });
    }
    
    const userResult = await query(
      'SELECT id, role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];
    req.currentUserId = currentUser.id;
    req.userRole = currentUser.role;

    const normalizedRole = normalizeRole(currentUser.role);
    if (normalizedRole === 'ASHA' || normalizedRole === 'Doctor') {
      return next();
    }

    if (currentUser.id.toString() !== requestedUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};
