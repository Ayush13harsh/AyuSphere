let RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://ayusphere-backend.onrender.com/api/v1').replace(/\\n/g, '').trim();

// Defensive check: If deployed to Vercel/production but NEXT_PUBLIC_API_URL is accidentally set to localhost, force the production URL.
if (typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1') {
    if (RAW_API_URL.includes('localhost') || RAW_API_URL.includes('127.0.0.1')) {
        RAW_API_URL = 'https://ayusphere-backend.onrender.com/api/v1';
    }
}

export const API_URL = RAW_API_URL.replace(/\/+$/, '');
console.log("[api.js] Resolved API_URL:", API_URL);

/**
 * Fetch with automatic retry on network errors (e.g. server cold-starting on Render).
 * Retries up to `retries` times with exponential backoff starting at `baseDelay` ms.
 */
export async function fetchWithRetry(url, options = {}, retries = 2, baseDelay = 3000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            const isLastAttempt = attempt === retries;
            if (isLastAttempt || !(err instanceof TypeError)) {
                throw err;
            }
            await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        }
    }
}

/**
 * Returns a user-friendly error message for network failures,
 * distinguishing between offline (no internet) and server-unreachable scenarios.
 */
export function getNetworkErrorMessage(err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'You appear to be offline. Please check your internet connection and try again.';
    }
    const suffix = err ? ` (${err.message})` : '';
    return `Unable to reach the server at ${API_URL} — it may be starting up. Please try again in a moment.` + suffix;
}

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
}

export async function fetchAPI(endpoint, options = {}) {
    let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        let response = await fetchWithRetry(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401 && token) {
            try {
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = refreshAccessToken();
                }
                const newToken = await refreshPromise;
                isRefreshing = false;
                refreshPromise = null;

                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetchWithRetry(`${API_URL}${endpoint}`, {
                    ...options,
                    headers,
                });
            } catch (refreshError) {
                isRefreshing = false;
                refreshPromise = null;
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/';
                }
                throw refreshError;
            }
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(text || 'Network or Server Error');
        }

        if (!response.ok) {
            let errorMsg = data.detail || 'API Error';
            if (Array.isArray(data.detail)) {
                errorMsg = data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ');
            }
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        console.error("[fetchAPI] EXCEPTION CAUGHT:", {
            endpoint,
            message: error.message,
            stack: error.stack,
            error
        });
        throw error;
    }
}
