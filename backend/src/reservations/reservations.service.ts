import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { Asset } from '../assets/entities/asset.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: {
      assetId: string;
      startsAt: string;
      endsAt: string;
      purpose?: string;
    },
    userId: string,
  ): Promise<Reservation> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const asset = await this.assetRepo.findOneBy({ id: dto.assetId });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.status === 'RETIRED') {
      throw new BadRequestException('Cannot reserve a retired asset');
    }

    const overlap = await this.dataSource.query(
      `SELECT id FROM reservations
       WHERE "assetId" = $1
         AND status IN ('PENDING', 'CONFIRMED')
         AND "startsAt" < $3
         AND "endsAt" > $2
       LIMIT 1`,
      [dto.assetId, startsAt, endsAt],
    );

    if (overlap.length > 0) {
      throw new ConflictException(
        'Asset is already reserved during the requested time window',
      );
    }

    const reservation = this.reservationRepo.create({
      assetId: dto.assetId,
      reservedByUserId: userId,
      startsAt,
      endsAt,
      purpose: dto.purpose,
      status: 'PENDING',
    });

    return this.reservationRepo.save(reservation);
  }

  async findAll(filters: {
    assetId?: string;
    userId?: string;
    from?: string;
    to?: string;
    status?: string;
  }): Promise<Reservation[]> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.asset', 'asset')
      .leftJoinAndSelect('r.reservedBy', 'reservedBy');

    if (filters.assetId) {
      qb.andWhere('r.assetId = :assetId', { assetId: filters.assetId });
    }
    if (filters.userId) {
      qb.andWhere('r.reservedByUserId = :userId', { userId: filters.userId });
    }
    if (filters.from) {
      qb.andWhere('r.startsAt >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('r.endsAt <= :to', { to: new Date(filters.to) });
    }
    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }

    qb.orderBy('r.startsAt', 'DESC');

    return qb.getMany();
  }

  async getAvailability(
    assetId: string,
    from: string,
    to: string,
  ): Promise<{ busy: Array<{ startsAt: Date; endsAt: Date }> }> {
    const reservations = await this.reservationRepo.find({
      where: {
        assetId,
        status: 'CONFIRMED',
      },
      select: ['startsAt', 'endsAt'],
    });

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const busy = reservations.filter(
      (r) => r.startsAt < toDate && r.endsAt > fromDate,
    );

    return { busy };
  }

  async cancel(
    id: string,
    userId: string,
    role: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOneBy({ id });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const isOwner = reservation.reservedByUserId === userId;
    const canCancel =
      isOwner || role === 'ADMIN' || role === 'MANAGER';

    if (!canCancel) {
      throw new ForbiddenException(
        'You can only cancel your own reservations unless you are a manager or admin',
      );
    }

    if (
      reservation.status === 'CANCELLED' ||
      reservation.status === 'COMPLETED'
    ) {
      throw new BadRequestException(
        `Cannot cancel a reservation with status ${reservation.status}`,
      );
    }

    reservation.status = 'CANCELLED';
    return this.reservationRepo.save(reservation);
  }

  async confirm(id: string, role: string): Promise<Reservation> {
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      throw new ForbiddenException('Only managers or admins can confirm reservations');
    }

    const reservation = await this.reservationRepo.findOneBy({ id });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm a reservation with status ${reservation.status}`,
      );
    }

    reservation.status = 'CONFIRMED';
    return this.reservationRepo.save(reservation);
  }
}
