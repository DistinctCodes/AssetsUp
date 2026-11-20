import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    // Applies the @Exclude() rules on entities (password and token hashes).
    // Registered AFTER the response wrapper on purpose: global interceptors see
    // the response in reverse order, so this one serializes the handler's raw
    // result before ResponseTransformInterceptor wraps it.
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class CommonModule {}
