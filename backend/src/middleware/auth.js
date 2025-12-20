const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = require('../config/supabase');

/**
 * Middleware to authenticate requests using Supabase JWT
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a Supabase client with the user's token for auth verification
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Get user profile with role using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      console.error('User ID:', user.id);
      console.error('User email:', user.email);
      return res.status(401).json({ 
        success: false, 
        error: 'User profile not found',
        details: profileError.message
      });
    }

    if (!profile) {
      console.error('Profile not found for user:', user.id, user.email);
      return res.status(401).json({ 
        success: false, 
        error: 'User profile not found' 
      });
    }

    // Attach user and profile to request
    req.user = user;
    req.profile = profile;
    req.supabase = supabase;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during authentication' 
    });
  }
};

module.exports = { authenticateUser };

