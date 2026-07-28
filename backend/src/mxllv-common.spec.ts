import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { of } from 'rxjs';

describe('mxllv Common Module & Config Setup (Issues #1129, #1128, #1127, #1126)', () => {
  it('ResponseTransformInterceptor wraps response in success envelope', (done) => {
    const interceptor = new ResponseTransformInterceptor<string>();
    const context: any = {};
    const next: any = { handle: () => of('test-data') };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.data).toBe('test-data');
      done();
    });
  });

  it('AllExceptionsFilter is defined', () => {
    const filter = new AllExceptionsFilter();
    expect(filter).toBeDefined();
  });
});
