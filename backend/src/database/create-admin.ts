import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Creates the first ADMIN from INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD.
 * Does nothing when an admin already exists, so it is safe to run repeatedly.
 * Run with: ts-node src/database/create-admin.ts
 */
export async function createInitialAdmin(ds: DataSource): Promise<boolean> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) return false;

  const users = ds.getRepository(User);
  if (await users.exist({ where: { role: UserRole.ADMIN } })) return false;

  await users.save(
    users.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      firstName: 'Initial',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    }),
  );
  return true;
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppDataSource } = require('../data-source') as { AppDataSource: DataSource };
  AppDataSource.initialize()
    .then((ds) => createInitialAdmin(ds))
    .then((created) => console.log(created ? 'Admin created' : 'No admin created'))
    .then(() => AppDataSource.destroy());
}
