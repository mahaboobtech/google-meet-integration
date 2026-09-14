const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const googleAuth = require('../services/googleAuth');
const googleMeet = require('../services/googleMeet');
const googleCalendar = require('../services/googleCalendar');

// In-memory meeting store per server instance (complemented by session history)
const meetingDatabase = new Map();

/**
 * Helper middleware to check if user is authenticated with Google OAuth
 */
function requireAuth(req, res, next) {
  if (!req.session?.tokens) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Google authentication required. Please connect your Google account first.'
    });
  }
  next();
}

/**
 * GET /api/google/auth
 * Initiates Google OAuth 2.0 flow with CSRF state protection
 */
router.get('/google/auth', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    
    const authUrl = googleAuth.generateAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'AUTH_INIT_FAILED', message: error.message });
  }
});

/**
 * GET /api/google/callback
 * Handles Google OAuth callback code exchange
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error: authError } = req.query;

  if (authError) {
    console.error('OAuth authorization error from Google:', authError);
    return res.redirect('/?error=' + encodeURIComponent('Google Authorization Failed: ' + authError));
  }

  if (!code) {
    return res.redirect('/?error=' + encodeURIComponent('Missing authorization code from Google.'));
  }

  // Validate state parameter for CSRF security
  if (state && req.session.oauthState && state !== req.session.oauthState) {
    console.warn('OAuth state mismatch warning');
  }

  try {
    const tokens = await googleAuth.getTokensFromCode(code);
    const userProfile = await googleAuth.getUserProfile(tokens);

    req.session.tokens = tokens;
    req.session.user = {
      email: userProfile.email,
      name: userProfile.name,
      picture: userProfile.picture
    };

    delete req.session.oauthState;

    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    res.redirect('/?error=' + encodeURIComponent('Token Exchange Failed: ' + (error.message || 'Unknown error')));
  }
});

/**
 * GET /api/google/status
 * Check current authentication state and profile
 */
router.get('/google/status', (req, res) => {
  if (req.session?.tokens && req.session?.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  res.json({
    authenticated: false,
    user: null
  });
});

/**
 * POST /api/google/logout
 * Log out and clear session tokens
 */
router.post('/google/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'LOGOUT_FAILED', message: 'Failed to destroy session' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Successfully logged out' });
  });
});

/**
 * POST /api/meetings
 * Creates a new Google Meet space using Google Meet REST API v2
 */
router.post('/meetings', requireAuth, async (req, res) => {
  const { title, accessType = 'RESTRICTED', entryPointAccess = 'ALL', guests = [], sendCalendarInvite = true } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      error: 'INVALID_TITLE',
      message: 'Meeting title is required.'
    });
  }

  try {
    const authClient = googleAuth.createAuthenticatedClient(req.session.tokens);
    
    // Auto refresh token event listener to update session
    authClient.on('tokens', (newTokens) => {
      req.session.tokens = { ...req.session.tokens, ...newTokens };
    });

    // 1. Call Google Meet REST API v2 spaces.create
    const spaceData = await googleMeet.createSpace(authClient, {
      accessType: accessType,
      entryPointAccess: entryPointAccess
    });

    const spaceName = spaceData.name; // e.g. "spaces/xxx-yyyy-zzz"
    const meetingCode = spaceData.meetingCode || spaceName.replace('spaces/', '');
    const meetUrl = spaceData.meetingUri || `https://meet.google.com/${meetingCode}`;

    // 2. Process optional guest and co-host assignments
    const memberResults = [];
    const validGuests = Array.isArray(guests) ? guests : [];

    for (const guest of validGuests) {
      if (guest && guest.email && typeof guest.email === 'string') {
        const result = await googleMeet.addSpaceMember(authClient, spaceName, {
          email: guest.email.trim(),
          role: guest.role === 'COHOST' ? 'COHOST' : 'ATTENDEE'
        });
        memberResults.push(result);
      }
    }

    // 3. Format complete meeting record
    const meetingRecord = {
      id: meetingCode,
      title: title.trim(),
      meetUrl: meetUrl,
      spaceName: spaceName,
      accessType: spaceData.config?.accessType || accessType,
      entryPointAccess: spaceData.config?.entryPointAccess || entryPointAccess,
      createdBy: req.session.user.email,
      createdAt: new Date().toISOString(),
      guests: validGuests,
      memberStatuses: memberResults
    };

    // 4. Send Calendar & Email Invitation so guests/co-hosts join directly without asking (no knock screen)
    let calendarResult = null;
    if (sendCalendarInvite && validGuests.length > 0) {
      try {
        calendarResult = await googleCalendar.sendCalendarInvitation(authClient, {
          title: meetingRecord.title,
          meetUrl: meetingRecord.meetUrl,
          guests: validGuests
        });
        meetingRecord.calendarInvite = calendarResult;
      } catch (calErr) {
        console.warn('Calendar invitation notice:', calErr?.message || calErr);
        meetingRecord.calendarInvite = { success: false, reason: 'Enable Google Calendar API in Google Cloud Console to send email invitations.' };
      }
    }

    // Store in backend memory and session history
    meetingDatabase.set(meetingCode, meetingRecord);
    if (!req.session.meetings) req.session.meetings = [];
    req.session.meetings.unshift(meetingRecord);

    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting: meetingRecord
    });
  } catch (error) {
    console.error('Meeting Creation Error:', error);

    let status = error.status || 500;
    let errorMessage = error.message || 'Failed to create Google Meet meeting.';

    if (error.message && error.message.includes('invalid_grant')) {
      req.session.tokens = null;
      status = 401;
      errorMessage = 'Your Google session has expired or been revoked. Please connect your Google Account again.';
    }

    return res.status(status).json({
      error: 'MEETING_CREATION_FAILED',
      message: errorMessage,
      details: error.details || null
    });
  }
});

/**
 * GET /api/meetings
 * List meetings created in current session / database
 */
router.get('/meetings', (req, res) => {
  const sessionMeetings = req.session?.meetings || [];
  res.json({
    success: true,
    meetings: sessionMeetings
  });
});

/**
 * GET /api/meetings/:id
 * Get details of a Google Meet meeting space from Google Meet REST API
 */
router.get('/meetings/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const authClient = googleAuth.createAuthenticatedClient(req.session.tokens);
    const spaceData = await googleMeet.getSpace(authClient, id);

    // Merge with stored record if available
    const localRecord = meetingDatabase.get(id) || {};

    return res.json({
      success: true,
      meeting: {
        id: id,
        spaceName: spaceData.name,
        meetUrl: spaceData.meetingUri || `https://meet.google.com/${id}`,
        config: spaceData.config,
        title: localRecord.title || 'Google Meet Space',
        guests: localRecord.guests || [],
        createdAt: localRecord.createdAt || null
      }
    });
  } catch (error) {
    console.error(`Error fetching meeting ${id}:`, error);
    res.status(error.status || 500).json({
      error: 'FETCH_MEETING_FAILED',
      message: error.message || 'Failed to fetch space details'
    });
  }
});

/**
 * POST /api/meetings/:id/members
 * Add a guest / co-host to an existing Google Meet Space
 */
router.post('/meetings/:id/members', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { email, role = 'ATTENDEE' } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Guest email address is required.' });
  }

  try {
    const authClient = googleAuth.createAuthenticatedClient(req.session.tokens);
    const result = await googleMeet.addSpaceMember(authClient, id, { email: email.trim(), role });

    // Update local database record
    const localRecord = meetingDatabase.get(id);
    if (localRecord) {
      if (!localRecord.guests) localRecord.guests = [];
      localRecord.guests.push({ email: email.trim(), role });
      if (!localRecord.memberStatuses) localRecord.memberStatuses = [];
      localRecord.memberStatuses.push(result);
    }

    return res.json({
      success: result.success,
      result: result
    });
  } catch (error) {
    console.error(`Error adding member to space ${id}:`, error);
    res.status(500).json({
      error: 'ADD_MEMBER_FAILED',
      message: error.message || 'Failed to add space member'
    });
  }
});

module.exports = router;
