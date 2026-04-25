"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, config) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
    }
    async refresh(rawRefreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(rawRefreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.refreshToken) {
            throw new common_1.UnauthorizedException('User not found or token revoked');
        }
        const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshToken);
        if (!tokenMatches) {
            throw new common_1.UnauthorizedException('Refresh token mismatch');
        }
        return this.generateTokens(user.id, user.email);
    }
    async generateTokens(userId, email) {
        const jwtPayload = { sub: userId, email };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get('JWT_ACCESS_SECRET'),
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        const hashedRefresh = await bcrypt.hash(refreshToken, 10);
        await this.usersService.save({ id: userId, refreshToken: hashedRefresh });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map