import { useAuthStore } from './auth.store';
import { authApi } from '@/lib/auth-api';

// Mock the authApi
jest.mock('@/lib/auth-api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  },
}));

const mockAuthUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
};

const mockAuthResponse = {
  user: mockAuthUser,
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
};

describe('useAuthStore', () => {
  // Reset store and mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    localStorage.clear();
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
  });

  describe('login', () => {
    it('should set user, isAuthenticated, and persist tokens to localStorage and cookies on successful login', async () => {
      (authApi.login as jest.Mock).mockResolvedValue(mockAuthResponse);

      const { login } = useAuthStore.getState();
      await login({ email: 'test@example.com', password: 'password123' });

      // Check store state
      expect(useAuthStore.getState().user).toEqual(mockAuthUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);

      // Check localStorage
      expect(localStorage.getItem('accessToken')).toBe('test-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');

      // Check cookie
      expect(document.cookie).toContain('accessToken=test-access-token');
    });

    it('should set isLoading to true during login and reset to false even if login fails', async () => {
      (authApi.login as jest.Mock).mockRejectedValue(new Error('Login failed'));

      const { login } = useAuthStore.getState();
      const loginPromise = login({ email: 'test@example.com', password: 'wrong' });
      
      // Check that isLoading is true immediately after calling login
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await loginPromise.catch(() => {});
      
      // Check that isLoading is reset to false
      expect(useAuthStore.getState().isLoading).toBe(false);
      // State should remain unauthenticated
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user, isAuthenticated, and remove tokens from localStorage and cookies', async () => {
      // First set a logged-in state
      useAuthStore.setState({
        user: mockAuthUser,
        isAuthenticated: true,
      });
      localStorage.setItem('accessToken', 'test-access-token');
      localStorage.setItem('refreshToken', 'test-refresh-token');
      document.cookie = 'accessToken=test-access-token; path=/';

      (authApi.logout as jest.Mock).mockResolvedValue({});

      const { logout } = useAuthStore.getState();
      await logout();

      // Check store state is cleared
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Check localStorage is cleared
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();

      // Check cookie is cleared
      expect(document.cookie).not.toContain('accessToken=test-access-token');
    });

    it('should clear state and tokens even if the logout API call fails', async () => {
      // First set a logged-in state
      useAuthStore.setState({
        user: mockAuthUser,
        isAuthenticated: true,
      });
      localStorage.setItem('accessToken', 'test-access-token');
      localStorage.setItem('refreshToken', 'test-refresh-token');
      document.cookie = 'accessToken=test-access-token; path=/';

      (authApi.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      const { logout } = useAuthStore.getState();
      await logout().catch(() => {});

      // Check store state is cleared even if API fails
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Check localStorage and cookies are still cleared
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(document.cookie).not.toContain('accessToken=test-access-token');
    });
  });

  describe('loadUser (rehydration)', () => {
    it('should load and set user state when there is a valid token in localStorage and me() succeeds', async () => {
      // Set a token in localStorage to simulate a persisted session
      localStorage.setItem('accessToken', 'valid-token');
      (authApi.me as jest.Mock).mockResolvedValue(mockAuthUser);

      const { loadUser } = useAuthStore.getState();
      const loadPromise = loadUser();
      
      // Check isLoading is true during load
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await loadPromise;

      // Check store is updated
      expect(useAuthStore.getState().user).toEqual(mockAuthUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
      // Token remains in localStorage
      expect(localStorage.getItem('accessToken')).toBe('valid-token');
    });

    it('should do nothing if there is no accessToken in localStorage', async () => {
      // No token in localStorage
      const { loadUser } = useAuthStore.getState();
      await loadUser();

      // State remains unauthenticated
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
      // authApi.me is never called
      expect(authApi.me).not.toHaveBeenCalled();
    });

    it('should clear all state and tokens if me() fails (invalid/expired token)', async () => {
      // Set an invalid/expired token in localStorage
      localStorage.setItem('accessToken', 'expired-token');
      localStorage.setItem('refreshToken', 'old-refresh-token');
      document.cookie = 'accessToken=expired-token; path=/';
      
      (authApi.me as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const { loadUser } = useAuthStore.getState();
      const loadPromise = loadUser();
      
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await loadPromise;

      // Store state is cleared
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      // Tokens are removed from localStorage and cookie
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(document.cookie).not.toContain('accessToken=expired-token');
    });
  });
});