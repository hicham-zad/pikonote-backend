import supabase from '../config/supabase.js';

// Sign up with email
export const signUpWithEmail = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required' 
      });
    }

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          auth_provider: 'email'
        }
      }
    });

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Sign up error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Sign in with email
export const signInWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required' 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Update last login
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    res.json({
      success: true,
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Sign in with OAuth (Google/Apple) - generates auth URL
export const signInWithOAuth = async (req, res) => {
  try {
    const { provider } = req.body; // 'google' or 'apple'

    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider. Use "google" or "apple"' 
      });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.APP_URL}/auth/callback`
      }
    });

    if (error) throw error;

    res.json({
      success: true,
      url: data.url // Frontend should open this URL
    });

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Handle OAuth callback
export const handleOAuthCallback = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (error) throw error;

    // Update last login
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    res.json({
      success: true,
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Sign out
export const signOut = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Signed out successfully' 
    });

  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current user profile
// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile (might not exist yet)
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // ← Changed from .single() to .maybeSingle()

    // If profile doesn't exist, create it
    if (!profile) {
      console.log('Profile not found, creating...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || '',
          auth_provider: req.user.app_metadata?.provider || 'email',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Create profile error:', createError);
        // If creation fails, just return user without profile
        return res.json({
          success: true,
          user: req.user,
          profile: null,
          message: 'Profile will be created automatically'
        });
      }

      return res.json({
        success: true,
        user: req.user,
        profile: newProfile
      });
    }

    if (error) {
      console.error('Get profile error:', error);
      // Return user even if profile fails
      return res.json({
        success: true,
        user: req.user,
        profile: null
      });
    }

    res.json({
      success: true,
      user: req.user,
      profile
    });

  } catch (error) {
    console.error('Get current user error:', error);
    // Always return user even if profile fails
    res.json({
      success: true,
      user: req.user,
      profile: null,
      error: error.message
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      fullName, 
      avatarUrl, 
      preferredDifficulty,
      notificationEnabled,
      theme 
    } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (fullName !== undefined) updates.full_name = fullName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (preferredDifficulty !== undefined) updates.preferred_difficulty = preferredDifficulty;
    if (notificationEnabled !== undefined) updates.notification_enabled = notificationEnabled;
    if (theme !== undefined) updates.theme = theme;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: data
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // This will cascade delete user_profiles and topics due to foreign keys
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) throw error;

    res.json({
      success: true,
      session: data.session
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(400).json({ error: error.message });
  }
};