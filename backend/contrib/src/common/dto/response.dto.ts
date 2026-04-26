/**
 * Standardized API response DTO
 */
export class ResponseDto<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: Date;
  path?: string;

  constructor(data?: T, message?: string, path?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.timestamp = new Date();
    this.path = path;
  }
}

/**
 * Standardized error response DTO
 */
export class ErrorResponseDto {
  success: boolean;
  error: string;
  message?: string;
  statusCode: number;
  timestamp: Date;
  path?: string;

  constructor(error: string, statusCode: number, message?: string, path?: string) {
    this.success = false;
    this.error = error;
    this.statusCode = statusCode;
    this.message = message;
    this.timestamp = new Date();
    this.path = path;
  }
}
