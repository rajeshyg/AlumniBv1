import axios from 'axios';
import { ApiResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API functions that can be shared between platforms
export const fetchData = async <T>(endpoint: string): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(endpoint);
  return response.data;
};

export const postData = async <T>(
  endpoint: string,
  data: unknown
): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(endpoint, data);
  return response.data;
};

export const putData = async <T>(
  endpoint: string,
  data: unknown
): Promise<ApiResponse<T>> => {
  const response = await api.put<ApiResponse<T>>(endpoint, data);
  return response.data;
};

export const deleteData = async <T>(endpoint: string): Promise<ApiResponse<T>> => {
  const response = await api.delete<ApiResponse<T>>(endpoint);
  return response.data;
};

export default api;