import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

/**
 * Global exception filter to standardize all error responses
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const path = request.path;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Internal Server Error';
    let message: string | undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        errorMessage = responseObj.error || exception.message;
        message = responseObj.message || exception.message;
      } else {
        errorMessage = exceptionResponse as string;
        message = exception.message;
      }
    }
    // Handle BadRequestException (validation errors)
    else if (exception instanceof BadRequestException) {
      statusCode = HttpStatus.BAD_REQUEST;
      const exceptionResponse = exception.getResponse() as any;
      errorMessage = 'Bad Request';
      message = exceptionResponse.message || 'Validation failed';
    }
    // Handle generic Error
    else if (exception instanceof Error) {
      errorMessage = exception.message || 'Internal Server Error';
      message = exception.message;
    }

    const errorResponse = new ErrorResponseDto(
      errorMessage,
      statusCode,
      message,
      path,
    );

    response.status(statusCode).json(errorResponse);
  }
}
