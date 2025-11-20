const { supabase } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Your session has expired. Please log in again.'
      });
    }

    // Fetch additional user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Continue even if user data fetch fails - we have basic auth
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      ...userData // Additional fields like subscription_tier, name, etc.
    };
    
    // Store the user's JWT token for database operations
    // This is needed for RLS to work properly
    req.userToken = token;
    
    // Create a user-authenticated Supabase client for this request
    // This client will pass the user's JWT token with every database operation
    req.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred while verifying your session'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both authenticated and anonymous users
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        ...userData
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
}

/**
 * Check if user has required subscription tier
 */
function requireSubscription(...allowedTiers) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const userTier = req.user.subscription_tier || 'free';
    
    if (!allowedTiers.includes(userTier)) {
      return res.status(403).json({ 
        error: 'Upgrade required',
        message: `This feature requires a ${allowedTiers.join(' or ')} subscription`,
        current_tier: userTier,
        required_tiers: allowedTiers
      });
    }

    next();
  };
}

/**
 * Check usage limits for current billing period
 */
async function checkUsageLimit(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role || 'user';
    const userTier = req.user.subscription_tier || 'free';

    // Admin email whitelist - bypass all limits
    const ADMIN_EMAILS = ['alfiemarkj@gmail.com', 'd.o.lamb2002@gmail.com'];
    if (ADMIN_EMAILS.includes(userEmail)) {
      req.usage = {
        used: 0,
        limit: -1,
        remaining: -1,
        unlimited: true
      };
      return next();
    }

    // Admins and unlimited tier users bypass all limits
    if (userRole === 'admin' || userTier === 'unlimited' || userTier === 'school') {
      req.usage = {
        used: 0,
        limit: -1,
        remaining: -1,
        unlimited: true
      };
      return next();
    }

    // Define limits per tier
    const TIER_LIMITS = {
      free: 5,
      teacher: 50,
      school: -1 // unlimited
    };

    const limit = TIER_LIMITS[userTier];

    // Unlimited tier (double check)
    if (limit === -1) {
      req.usage = {
        used: 0,
        limit: -1,
        remaining: -1,
        unlimited: true
      };
      return next();
    }

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Use the user-authenticated Supabase client (already created in authenticateUser)
    const { count, error } = await req.supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error checking usage:', error);
      // Don't block user if we can't check usage
      return next();
    }

    const usage = count || 0;

    if (usage >= limit) {
      const daysUntilReset = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1) - new Date();
      const daysRemaining = Math.ceil(daysUntilReset / (1000 * 60 * 60 * 24));

      return res.status(429).json({
        error: 'Monthly limit reached',
        message: `You've used all ${limit} lessons this month. Upgrade for more!`,
        usage: {
          used: usage,
          limit: limit,
          resets_in_days: daysRemaining
        },
        upgrade_url: '/pricing'
      });
    }

    // Attach usage info to request
    req.usage = {
      used: usage,
      limit: limit,
      remaining: limit - usage
    };

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    // Don't block user on error
    next();
  }
}

module.exports = {
  authenticateUser,
  optionalAuth,
  requireSubscription,
  checkUsageLimit
};

