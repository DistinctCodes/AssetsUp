

@Injectable()
export class HealthService {
  getHealthStatus(): string {
    return 'OK';
  }
}