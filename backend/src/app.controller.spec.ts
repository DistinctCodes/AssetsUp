import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return health status object', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('status', 'OK');
      expect(result).toHaveProperty('message', 'Server is running');
      expect(result).toHaveProperty('Timestamp');
      expect(typeof result.Timestamp).toBe('number');
    });
  });
});
