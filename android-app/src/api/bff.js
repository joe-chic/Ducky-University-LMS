import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:4000';

export const getToken = async () => {
  return await AsyncStorage.getItem('ducky_token');
};

export const getRole = async () => {
  return await AsyncStorage.getItem('ducky_role');
};

export const saveSession = async (token, role) => {
  await AsyncStorage.setItem('ducky_token', token);
  await AsyncStorage.setItem('ducky_role', role);
};

export const clearSession = async () => {
  await AsyncStorage.removeItem('ducky_token');
  await AsyncStorage.removeItem('ducky_role');
};

const buildUrl = (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
  });
  return url.toString();
};

export const bffGet = async (path, { token, params } = {}) => {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
};

export const bffPost = async (path, body, { token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
};

export const bffPut = async (path, body, { token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
};

export const bffDelete = async (path, { token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
};