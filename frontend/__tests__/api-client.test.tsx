/* eslint-disable @typescript-eslint/no-require-imports */
import { api } from '@/lib/api';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock window.location
const originalLocation = window.location;
beforeEach(() => {
  delete (window as any).location;
  window.location = { ...originalLocation, href: '' };
  localStorage.clear();
  jest.clearAllMocks();
  
  // Reset the refresh state variables (we need to access them, so we'll clear module cache between tests if needed)
  jest.resetModules();
});

afterAll(() => {
  window.location = originalLocation;
});

describe('API Client', () => {
  describe('Auth Header Injection', () => {
    it('adds Authorization header with access token from localStorage when token exists', async () => {
      // Set up localStorage with a token
      const testToken = 'test_access_token_123';
      localStorage.setItem('accessToken', testToken);
      
      // Mock the axios instance's get method to resolve
      (mockedAxios.create as jest.Mock).mockReturnValue({
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue({ data: {} }),
      });
      
      // Import the api after mocking to get the fresh instance
      const { api } = require('@/lib/api');
      await api.get('/test-endpoint');
      
      // Check that the request was made with the correct Authorization header
      expect(api.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
      }));
    });

    it('does not add Authorization header when no access token exists in localStorage', async () => {
      (mockedAxios.create as jest.Mock).mockReturnValue({
        interceptors: {
          request: { use: jest.fn((config) => config) },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue({ data: {} }),
      });
      
      const { api } = require('@/lib/api');
      await api.get('/test-endpoint');
      
      expect(api.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      }));
      expect(api.get).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      }));
    });
  });

  describe('401 Refresh and Retry Flow', () => {
    it('successfully refreshes token and retries original request on 401', async () => {
      const refreshToken = 'test_refresh_token';
      const newAccessToken = 'new_access_token_123';
      const newRefreshToken = 'new_refresh_token_123';
      localStorage.setItem('accessToken', 'old_expired_token');
      localStorage.setItem('refreshToken', refreshToken);

      // Mock the refresh endpoint to return new tokens
      mockedAxios.post.mockResolvedValueOnce({
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });

      // Create api instance with mock that first returns 401, then succeeds on retry
      const mockGet = jest.fn()
        .mockRejectedValueOnce({
          response: { status: 401 },
          config: {},
        })
        .mockResolvedValueOnce({ data: { success: true } });

      (mockedAxios.create as jest.Mock).mockReturnValue({
        interceptors: {
          request: { use: jest.fn((config) => config) },
          response: { use: jest.fn((fulfilled, rejected) => ({ fulfilled, rejected })) },
        },
        get: mockGet,
      });

      const { api } = require('@/lib/api');
      // We need to manually call the response interceptor to simulate the flow
      const responseInterceptor = (mockedAxios.create as jest.Mock).mock.results[0].value.interceptors.response.use;
      const error = { response: { status: 401 }, config: { _retry: false } };
      
      await expect(responseInterceptor.rejected(error)).resolves.toEqual({ data: { success: true } });
      
      // Verify refresh was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:6003/api/auth/refresh',
        {},
        expect.objectContaining({
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
      );
      
      // Verify new tokens were stored
      expect(localStorage.getItem('accessToken')).toBe(newAccessToken);
      expect(localStorage.getItem('refreshToken')).toBe(newRefreshToken);
      
      // Verify original request was retried with new token
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('clears tokens and redirects to login when refresh fails', async () => {
      localStorage.setItem('accessToken', 'expired_token');
      localStorage.setItem('refreshToken', 'invalid_refresh_token');

      // Mock refresh endpoint to fail
      mockedAxios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      (mockedAxios.create as jest.Mock).mockReturnValue({
        interceptors: {
          request: { use: jest.fn((config) => config) },
          response: { use: jest.fn((fulfilled, rejected) => ({ fulfilled, rejected })) },
        },
        get: jest.fn().mockRejectedValue({
          response: { status: 401 },
          config: { _retry: false },
        }),
      });

      const { api } = require('@/lib/api');
      const responseInterceptor = (mockedAxios.create as jest.Mock).mock.results[0].value.interceptors.response.use;
      const error = { response: { status: 401 }, config: { _retry: false } };
      
      await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);
      
      // Verify tokens were removed
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      
      // Verify redirect to login
      expect(window.location.href).toBe('/login');
    });

    it('only triggers one refresh call when multiple concurrent requests receive 401', async () => {
      const refreshToken = 'test_refresh_token';
      const newAccessToken = 'new_access_token_123';
      const newRefreshToken = 'new_refresh_token_123';
      localStorage.setItem('accessToken', 'old_expired_token');
      localStorage.setItem('refreshToken', refreshToken);

      // Mock the refresh endpoint - we'll count how many times it's called
      const refreshMock = jest.fn().mockResolvedValue({
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
      mockedAxios.post.mockImplementation(refreshMock);

      // Create api instance that returns 401 for first call, then succeeds
      const mockGet = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 }, config: { _retry: false } })
        .mockRejectedValueOnce({ response: { status: 401 }, config: { _retry: false } })
        .mockResolvedValue({ data: { success: true } });

      (mockedAxios.create as jest.Mock).mockReturnValue({
        interceptors: {
          request: { use: jest.fn((config) => config) },
          response: { use: jest.fn((fulfilled, rejected) => ({ fulfilled, rejected })) },
        },
        get: mockGet,
      });

      const { api } = require('@/lib/api');
      const responseInterceptor = (mockedAxios.create as jest.Mock).mock.results[0].value.interceptors.response.use;
      
      // Fire off two concurrent requests that both 401
      const error1 = { response: { status: 401 }, config: { _retry: false, url: '/endpoint1' } };
      const error2 = { response: { status: 401 }, config: { _retry: false, url: '/endpoint2' } };
      
      await Promise.all([
        responseInterceptor.rejected(error1),
        responseInterceptor.rejected(error2),
      ]);

      // Verify refresh was only called once, not twice!
      expect(refreshMock).toHaveBeenCalledTimes(1);
      
      // Both requests were retried
      expect(mockGet).toHaveBeenCalledTimes(4); // 2 initial failed, 2 successful retries
    });
  });
});