import { useState, useCallback } from 'react';
import { API_URL } from '../utils/constants';

export function useApi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { method = 'GET', body, password, params } = options;

      let url = `${API_URL}${path}`;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, value);
          }
        });
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (password) {
        headers['X-Admin-Password'] = password;
      }

      const fetchOptions = { method, headers };
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Request failed (${response.status})`);
      }

      if (response.status === 204) {
        setData(null);
        setLoading(false);
        return null;
      }

      const json = await response.json();
      setData(json);
      setLoading(false);
      return json;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return { data, loading, error, execute };
}
