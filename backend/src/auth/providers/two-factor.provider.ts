import { Injectable } from '@nestjs/common';
@Injectable()
export class TwoFactorProvider {
  async generateSecret(_email: string) {}

  async generateQrCode(_otpauthUrl: string) {}

  verifyCode(_secret: string, _token: string) {}

  generateBackupCodes() {}

  encryptSecret(_secret: string) {}

  decryptSecret(_secret: string) {}
}
