const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('resecure_token');
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('resecure_token', token);
  } else {
    localStorage.removeItem('resecure_token');
  }
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('resecure_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (_e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('resecure_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('resecure_user');
  }
};

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('resecure_token');
  localStorage.removeItem('resecure_user');
};

/**
 * Register user request
 */
export async function registerApi({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Registration failed');
  }

  return data;
}

/**
 * Login user request
 */
export async function loginApi({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Login failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Get current user request
 */
export async function fetchMeApi(token) {
  const authToken = token || getStoredToken();

  if (!authToken) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Session expired');
  }

  return data;
}

/**
 * Fetch screenshots from backend
 */
export async function fetchScreenshotsApi(params = {}) {
  const authToken = getStoredToken();
  if (!authToken) return { data: [], pagination: {} };

  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/screenshots?${query}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch screenshots');
  }

  return data;
}

/**
 * Upload screenshot to backend
 */
export async function uploadScreenshotApi(file) {
  const authToken = getStoredToken();
  if (!authToken) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('screenshot', file);

  const response = await fetch(`${API_BASE_URL}/screenshots/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to upload screenshot');
  }

  return data;
}

/**
 * Fetch screenshot by ID
 */
export async function fetchScreenshotByIdApi(id) {
  const authToken = getStoredToken();
  if (!authToken) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/screenshots/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch screenshot details');
  }

  return data;
}

/**
 * Delete screenshot by ID
 */
export async function deleteScreenshotApi(id) {
  const authToken = getStoredToken();
  if (!authToken) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/screenshots/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to delete screenshot');
  }

  return data;
}
/**
 * Fetch screenshots that are stored in Vault
 */
export async function fetchVaultApi(params = {}) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const query = new URLSearchParams(params).toString();

  const response = await fetch(
    `${API_BASE_URL}/screenshots/vault?${query}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Failed to fetch Vault items'
    );
  }

  return data;
}

/**
 * Move an existing screenshot into or out of Vault
 */
export async function toggleVaultApi(id) {
  const authToken = getStoredToken();

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/screenshots/${id}/vault`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Failed to update Vault status'
    );
  }

  return data;
}
