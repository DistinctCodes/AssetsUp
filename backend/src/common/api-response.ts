export class ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;

  static ok<T>(data: T, message = 'Success'): ApiResponse<T> {
    return { success: true, data, message };
  }

  static fail<T>(message: string): ApiResponse<T> {
    return { success: false, data: null as T, message };
  }
}
