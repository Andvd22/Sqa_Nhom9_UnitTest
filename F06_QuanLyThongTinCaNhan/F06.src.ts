export class AppError extends Error { constructor(msg: string, public statusCode = 500) { super(msg); this.name = 'AppError'; } }
export class ValidationError extends AppError { constructor(m: string) { super(m, 400); this.name = 'ValidationError'; } }
export class NotFoundError extends AppError { constructor(m: string) { super(m, 404); this.name = 'NotFoundError'; } }
export class ForbiddenError extends AppError { constructor(m: string) { super(m, 403); this.name = 'ForbiddenError'; } }
export class ConflictError extends AppError { constructor(m: string) { super(m, 409); this.name = 'ConflictError'; } }

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface IUserRecord {
  id?: number;
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  gender?: string;
  reload?(options?: any): Promise<void>;
  getDataValue?(key: string): any;
}

export interface IUserRepository {
  findByPk(id: number): Promise<IUserRecord | null>;
  findOne(options: any): Promise<any | null>;
  update(data: any, options: any): Promise<[number] | any>;
}

function readUserField(user: IUserRecord, key: string, fallback?: any) {
  const dataValue = user.getDataValue?.(key);
  if (dataValue !== undefined) return dataValue;
  const directValue = (user as any)[key];
  if (user.reload || user.getDataValue) {
    return directValue !== undefined ? directValue : fallback;
  }
  return fallback !== undefined ? fallback : directValue;
}

export class UpdateUserInfoUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(input: {
    userId: number;
    username?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    avatar?: string;
    gender?: string;
  }) {
    const user = await this.userRepo.findByPk(input.userId);
    if (!user) throw new NotFoundError('Nguoi dung khong ton tai');

    if (input.email && input.email !== user.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: input.email, id: { ne: input.userId } },
      });
      if (existingUser) throw new ConflictError('Email da duoc su dung');
    }

    const updateData: any = {};
    if (input.username) updateData.username = input.username;
    if (input.email) updateData.email = input.email;
    if (input.phone) updateData.phone = input.phone;
    if (input.avatar_url) updateData.avatar_url = input.avatar_url;
    if (input.avatar) updateData.avatar_url = input.avatar;
    if (input.gender) updateData.gender = input.gender;

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('Khong co du lieu nao de cap nhat');
    }

    const updateResult = await this.userRepo.update(updateData, { where: { id: input.userId } });
    const affectedRows = Array.isArray(updateResult) ? Number(updateResult[0] ?? 0) : Number(updateResult ?? 0);
    if (affectedRows === 0) {
      throw new ValidationError('Khong the cap nhat thong tin. Vui long thu lai.');
    }

    await user.reload?.();

    return {
      id: readUserField(user, 'id', input.userId),
      username: readUserField(user, 'username', updateData.username ?? user.username),
      email: readUserField(user, 'email', updateData.email ?? user.email),
      phone: readUserField(user, 'phone', updateData.phone ?? user.phone),
      avatar_url: readUserField(user, 'avatar_url', updateData.avatar_url ?? user.avatar_url),
      gender: readUserField(user, 'gender', updateData.gender ?? user.gender),
    };
  }
}

