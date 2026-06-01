import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('returns consistent JSON for HttpException errors', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const request = {
      url: '/api/assets',
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    const filter = new HttpExceptionFilter();
    filter.catch(new BadRequestException('Invalid asset payload'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid asset payload',
        error: 'Bad Request',
        timestamp: expect.any(String),
        path: '/api/assets',
      }),
    );
  });
});
