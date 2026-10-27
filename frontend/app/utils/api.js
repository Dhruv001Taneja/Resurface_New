const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5001/api/v1';

/**
 * Get stored authentication token
 */
export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('resecure_token');
};

/**
 * Store authentication token
 */
export const setStoredToken = (token) => {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem('resecure_token', token);
  } else {
    localStorage.removeItem('resecure_token');
  }
};

/**
 * Vault-specific session token helpers
 */
export const getVaultToken = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('resurface_vault_token');
};

export const setVaultToken = (token) => {
  if (typeof window === 'undefined') return;

  if (token) {
    sessionStorage.setItem('resurface_vault_token', token);
  } else {
    sessionStorage.removeItem('resurface_vault_token');
  }
};

export const clearVaultToken = () => {
  setVaultToken(null);
};

/**
 * Unlock Vault using the existing account password
 */
export async function unlockVaultApi(password) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/vault/unlock`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || 'Failed to unlock Vault'
    );
    error.status = response.status;
    throw error;
  }

  if (!data.vaultToken) {
    throw new Error('Vault token was not returned by the server');
  }

  setVaultToken(data.vaultToken);
  return data;
}

/**
 * Get stored user
 */
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('resecure_user');

  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (_e) {
    return null;
  }
};

/**
 * Store user
 */
export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem(
      'resecure_user',
      JSON.stringify(user)
    );
  } else {
    localStorage.removeItem('resecure_user');
  }
};

/**
 * Clear authentication storage
 */
export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('resecure_token');
  localStorage.removeItem('resecure_user');
};

/**
 * Register user request
 */
export async function registerApi({
  name,
  email,
  password,
}) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      'Registration failed'
    );
  }

  return data;
}

/**
 * Login user request
 */
export async function loginApi({
  email,
  password,
}) {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      'Login failed'
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

/**
 * Get current user request
 */
export async function fetchMeApi(token) {
  const authToken =
    token || getStoredToken();

  if (!authToken) {
    throw new Error(
      'No authentication token found'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      'Session expired'
    );
  }

  return data;
}

/**
 * Fetch screenshots from backend
 */
export async function fetchScreenshotsApi(
  params = {}
) {
  const authToken = getStoredToken();

  if (!authToken) {
    return {
      data: [],
      pagination: {},
    };
  }

  const query =
    new URLSearchParams(params).toString();

  const response = await fetch(
    `${API_BASE_URL}/screenshots?${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to fetch screenshots'
    );
  }

  return data;
}

/**
 * Upload screenshot to backend
 */
export async function uploadScreenshotApi(
  file
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();

  formData.append(
    'screenshot',
    file
  );

  const response = await fetch(
    `${API_BASE_URL}/screenshots/upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to upload screenshot'
    );
  }

  return data;
}

/**
 * Fetch screenshot by ID
 */

export async function fetchScreenshotByIdApi(id) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const vaultToken = getVaultToken();

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  if (vaultToken) {
    headers['X-Vault-Token'] = vaultToken;
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${id}`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      clearVaultToken();
    }

    const error = new Error(
      data.message ||
      data.error ||
      'Failed to fetch screenshot details'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}


/**
 * Delete screenshot by ID
 */
export async function deleteScreenshotApi(
  id
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to delete screenshot'
    );
  }

  return data;
};

/**
 * ==========================================
 * VAULT API ENDPOINTS
 * ==========================================
 */

/**
 * Fetch screenshots that are stored in Vault
 */

export async function fetchVaultApi(params = {}) {
  const authToken = getStoredToken();
  const vaultToken = getVaultToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  if (!vaultToken) {
    throw new Error('Unlock Vault to continue.');
  }

  const query = new URLSearchParams(params).toString();

  const response = await fetch(
    `${API_BASE_URL}/screenshots/vault?${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Vault-Token': vaultToken,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      clearVaultToken();
    }

    const error = new Error(
      data.message ||
      data.error ||
      'Failed to fetch Vault items'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Move an existing screenshot
 * into or out of Vault
 */

export async function toggleVaultApi(id) {
  const authToken = getStoredToken();
  const vaultToken = getVaultToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  if (!vaultToken) {
    throw new Error('Unlock Vault to continue.');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${id}/vault`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Vault-Token': vaultToken,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      clearVaultToken();
    }

    const error = new Error(
      data.message ||
      data.error ||
      'Failed to update Vault status'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * ==========================================
 * SCREENSHOT ACTION API ENDPOINTS
 * ==========================================
 */

/**
 * Update an extracted date
 */
export async function updateExtractedDateApi(
  screenshotId,
  payload
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${screenshotId}/date`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to update date'
    );
  }

  return data;
}

/**
 * Dismiss an action item
 */
export async function dismissActionItemApi(
  screenshotId,
  payload
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${screenshotId}/dismiss`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to dismiss item'
    );
  }

  return data;
}

/**
 * ==========================================
 * CALENDAR API ENDPOINTS
 * ==========================================
 */

/**
 * Fetch calendar events
 */
export async function fetchCalendarEventsApi() {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/calendar`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to fetch calendar events'
    );
  }

  return data;
}

/**
 * Create calendar event
 */
export async function createCalendarEventApi(
  eventData
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/calendar`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.error ||
      data.message ||
      'Failed to create calendar event'
    );

    error.status = response.status;
    error.data = data.data;

    throw error;
  }

  return data;
}

/**
 * Update calendar event
 */
export async function updateCalendarEventApi(
  id,
  eventData
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/calendar/${id}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to update calendar event'
    );
  }

  return data;
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEventApi(
  id
) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/calendar/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to delete calendar event'
    );
  }

  return data;
}

/**
 * Send email verification OTP
 */
export async function sendVerificationOtpApi({ email }) {
  const response = await fetch(
    `${API_BASE_URL}/auth/send-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to send verification code'
    )
  }

  return data
}

/**
 * Verify email using the six-digit OTP
 */
export async function verifyEmailOtpApi({ email, otp }) {
  const response = await fetch(
    `${API_BASE_URL}/auth/verify-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Email verification failed'
    )
  }

  return data
}
