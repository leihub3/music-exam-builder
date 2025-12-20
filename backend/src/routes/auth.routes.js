const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const supabaseAdmin = require('../config/supabase');

/**
 * Get current user profile
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
        profile: req.profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl
      })
      .eq('id', req.profile.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Change user role (admin only)
 */
router.put('/users/:userId/role', authenticateUser, async (req, res) => {
  try {
    // Check if requester is admin
    if (req.profile.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can change user roles'
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'INSTITUTION_ADMIN', 'TEACHER', 'STUDENT'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

