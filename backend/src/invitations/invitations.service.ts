import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { MoreThan, IsNull, Repository } from 'typeorm';
import { Invitation } from './invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepo: Repository<Invitation>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async create(invitedBy: User, dto: CreateInvitationDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const rawToken = randomBytes(24).toString('hex');
    const invitation = this.invitationsRepo.create({
      email,
      role: dto.role,
      token: this.hash(rawToken),
      invitedBy,
      invitedById: invitedBy.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
    });

    const saved = await this.invitationsRepo.save(invitation);
    await this.sendInviteEmail(saved.email, rawToken);

    return this.serialize(saved);
  }

  async findPending() {
    const now = new Date();
    const invitations = await this.invitationsRepo.find({
      where: {
        acceptedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((invitation) => this.serialize(invitation));
  }

  async revoke(id: string): Promise<void> {
    const result = await this.invitationsRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Invitation not found');
    }
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.invitationsRepo.findOne({
      where: {
        token: this.hash(dto.token),
      },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invitation is invalid or expired');
    }

    const existingUser = await this.usersService.findByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create({
      email: invitation.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: invitation.role,
      password: await bcrypt.hash(dto.password, 12),
    });

    invitation.acceptedAt = new Date();
    await this.invitationsRepo.save(invitation);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private serialize(invitation: Invitation) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy
        ? {
            id: invitation.invitedBy.id,
            email: invitation.invitedBy.email,
            firstName: invitation.invitedBy.firstName,
            lastName: invitation.invitedBy.lastName,
          }
        : undefined,
    };
  }

  private async sendInviteEmail(email: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const transport = nodemailer.createTransport(
      this.configService.get('SMTP_HOST')
        ? {
            host: this.configService.get('SMTP_HOST'),
            port: Number(this.configService.get('SMTP_PORT', 587)),
            secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
            auth: this.configService.get('SMTP_USER')
              ? {
                  user: this.configService.get('SMTP_USER'),
                  pass: this.configService.get('SMTP_PASS'),
                }
              : undefined,
          }
        : { jsonTransport: true },
    );

    await transport.sendMail({
      from: this.configService.get('MAIL_FROM', 'noreply@assetsup.local'),
      to: email,
      subject: 'You have been invited to AssetsUp',
      text: `Accept your invitation: ${frontendUrl}/accept-invitation?token=${token}`,
    });
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
