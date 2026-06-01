


export class healthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    getHealth(): string {
        return this.healthService.getHealthStatus();
    }
}