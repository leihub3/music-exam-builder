/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const userRole = req.profile.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

/**
 * Check if user is a teacher or higher
 */
const requireTeacher = requireRole(['TEACHER', 'INSTITUTION_ADMIN', 'ADMIN']);

/**
 * Check if user is an institution admin or higher
 */
const requireInstitutionAdmin = requireRole(['INSTITUTION_ADMIN', 'ADMIN']);

/**
 * Check if user is a platform admin
 */
const requireAdmin = requireRole(['ADMIN']);

/**
 * Check if user is a student
 */
const requireStudent = requireRole(['STUDENT']);

module.exports = {
  requireRole,
  requireTeacher,
  requireInstitutionAdmin,
  requireAdmin,
  requireStudent
};

