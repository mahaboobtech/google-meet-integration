const { google } = require('googleapis');

/**
 * Creates a Calendar Event with native Google Meet conference and sends email invites.
 * Sets guestsCanInviteOthers: true so "Invite others" is checked [x], and conferenceDataVersion: 1
 * so guests & co-hosts JOIN DIRECTLY WITHOUT ASKING (no knock screen).
 */
async function sendCalendarInvitation(authClient, meetingDetails = {}) {
  const {
    title,
    meetUrl,
    guests = [],
    startTime,
    endTime
  } = meetingDetails;

  if (!guests || guests.length === 0) {
    return { success: false, reason: 'No guests specified for calendar invitation' };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const startIso = startTime || now.toISOString();
    const endIso = endTime || new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const meetingCode = meetUrl ? meetUrl.split('/').pop() : '';

    const attendees = guests.map(g => ({
      email: g.email.trim(),
      displayName: g.email.split('@')[0]
    }));

    const eventPayload = {
      summary: title || 'Google Meet Meeting',
      description: `Join Google Meet Meeting directly:\n${meetUrl || ''}\n\nCo-hosts & guests invited via website.`,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      location: meetUrl || '',
      attendees: attendees,
      guestsCanSeeOtherGuests: true,
      guestsCanInviteOthers: true, // Crucial: Ensures "Invite others" is checked [x] in Calendar
      guestsCanModify: false,
      conferenceData: {
        createRequest: {
          requestId: 'meetflow-' + Date.now(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    // If meetUrl was pre-created, link it via conferenceId as well
    if (meetingCode) {
      eventPayload.conferenceData.conferenceId = meetingCode;
      eventPayload.conferenceData.entryPoints = [
        {
          entryPointType: 'video',
          uri: meetUrl,
          label: meetUrl
        }
      ];
    }

    // Call Google Calendar API with conferenceDataVersion: 1
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1, // MANDATORY: Enables native Google Meet attendee registration for direct join without asking
      requestBody: eventPayload,
      sendUpdates: 'all' // Emails invite and registers attendees on Google servers to bypass knock screen
    });

    const generatedMeetUrl = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || meetUrl;

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetUrl: generatedMeetUrl,
      message: 'Calendar invites sent! "Invite others" is checked [x] and Co-hosts/Guests can join directly without asking.'
    };
  } catch (error) {
    console.error('Error sending calendar invitation:', error?.response?.data || error.message);
    return {
      success: false,
      reason: error?.response?.data?.error?.message || error.message || 'Failed to send calendar invitation'
    };
  }
}

module.exports = {
  sendCalendarInvitation
};
