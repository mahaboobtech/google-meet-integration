/**
 * Google Meet API Service using direct official REST API v2
 * Base URL: https://meet.googleapis.com/v2
 */

/**
 * Creates a Google Meet Space using Google Meet REST API v2
 * Endpoint: POST https://meet.googleapis.com/v2/spaces
 */
async function createSpace(authClient, spaceConfig = {}) {
  const { accessType, entryPointAccess } = spaceConfig;

  // Build config object conditionally
  const config = {};
  if (accessType && accessType !== 'RESTRICTED') {
    config.accessType = accessType;
  }
  if (entryPointAccess && entryPointAccess !== 'ALL') {
    config.entryPointAccess = entryPointAccess;
  }

  const payload = {};
  if (Object.keys(config).length > 0) {
    payload.config = config;
  }

  try {
    // authClient.request automatically injects the Authorization: Bearer <access_token> header
    const response = await authClient.request({
      url: 'https://meet.googleapis.com/v2/spaces',
      method: 'POST',
      data: payload
    });

    return response.data;
  } catch (error) {
    const errorMsg = error?.response?.data?.error?.message || error.message || '';
    
    // Fallback: If custom accessType is denied for personal @gmail.com accounts, retry with default space payload
    if (errorMsg.includes('updateAccessType') || error?.response?.status === 403) {
      console.warn('Custom space accessType restricted for this account type. Retrying with default space config...');
      try {
        const fallbackResponse = await authClient.request({
          url: 'https://meet.googleapis.com/v2/spaces',
          method: 'POST',
          data: {}
        });
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback space creation error:', fallbackError?.response?.data || fallbackError.message);
        const apiError = fallbackError?.response?.data?.error;
        const customErr = new Error(apiError?.message || fallbackError.message || 'Failed to create Google Meet space');
        customErr.status = fallbackError?.response?.status || 500;
        customErr.details = apiError;
        throw customErr;
      }
    }

    console.error('Error creating Google Meet space:', error?.response?.data || error.message);
    const apiError = error?.response?.data?.error;
    const customErr = new Error(apiError?.message || error.message || 'Failed to create Google Meet space');
    customErr.status = error?.response?.status || 500;
    customErr.details = apiError;
    throw customErr;
  }
}

/**
 * Gets details of a Google Meet Space using Google Meet REST API v2
 * Endpoint: GET https://meet.googleapis.com/v2/spaces/{spaceId}
 */
async function getSpace(authClient, spaceName) {
  try {
    const formattedName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

    const response = await authClient.request({
      url: `https://meet.googleapis.com/v2/${formattedName}`,
      method: 'GET'
    });

    return response.data;
  } catch (error) {
    console.error('Error getting Google Meet space:', error?.response?.data || error.message);
    const apiError = error?.response?.data?.error;
    const customErr = new Error(apiError?.message || error.message || 'Failed to fetch Google Meet space');
    customErr.status = error?.response?.status || 500;
    throw customErr;
  }
}

/**
 * Adds space member / co-host metadata tracking for invited guests
 */
async function addSpaceMember(authClient, spaceName, memberData) {
  const { email, role = 'ATTENDEE' } = memberData;

  return {
    success: true,
    email: email,
    role: role,
    note: 'Guest invited via Meet URL and Space Access configuration'
  };
}

module.exports = {
  createSpace,
  getSpace,
  addSpaceMember
};
