@Injectable()
export class TwoFactorProvider {
  async generateSecret(email: string) {}

  async generateQrCode(otpauthUrl: string) {}

  verifyCode(secret: string, token: string) {}

  generateBackupCodes() {}

  encryptSecret(secret: string) {}

  decryptSecret(secret: string) {}
}