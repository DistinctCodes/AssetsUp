import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (
        responseBody &&
        typeof responseBody === 'object' &&
        'message' in responseBody
      ) {
        const messageValue = (responseBody as any).message;
        if (Array.isArray(messageValue)) {
          message = messageValue.join(', ');
        } else {
          message = messageValue;
        }
        error = (responseBody as any).error ?? exception.name;
      } else {
        message = exception.message;
      }
      error = error || exception.name;
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : exception.message;
      error = exception.name ?? error;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
