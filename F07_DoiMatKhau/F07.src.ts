export class AppError extends Error { constructor(msg: string, public statusCode = 500) { super(msg); this.name = 'AppError'; } }
export class ValidationError extends AppError { constructor(m: string) { super(m, 400); this.name = 'ValidationError'; } }
export class NotFoundError extends AppError { constructor(m: string) { super(m, 404); this.name = 'NotFoundError'; } }
export class ForbiddenError extends AppError { constructor(m: string) { super(m, 403); this.name = 'ForbiddenError'; } }
export class ConflictError extends AppError { constructor(m: string) { super(m, 409); this.name = 'ConflictError'; } }

export interface IUserRecord {
  google_id?: any;
  password_hash?: any;
  comparePassword(password: string): Promise<boolean>;
  reload?(options?: any): Promise<void>;
  getDataValue?(key: string): any;
}

export interface IUserRepository {
  findByPk(id: number, options?: any): Promise<IUserRecord | null>;
  update(data: any, options: any): Promise<[number] | any>;
}
export interface IPasswordService {
  hash(password: string): Promise<string>;
}

export class ChangePasswordUseCase {
  constructor(private userRepo: IUserRepository, private pwdSvc: IPasswordService) {}

  async execute(input: { userId: number; oldPass: string; newPass: string; confirmPass?: string }) {
    const user = await this.userRepo.findByPk(input.userId, { attributes: { include: ['password_hash'] } });
    if (!user) throw new NotFoundError('Nguoi dung khong ton tai');

    const googleId = user.google_id ?? user.getDataValue?.('google_id');
    if (googleId !== null && googleId !== undefined && googleId !== '') {
      throw new ValidationError('Tai khoan nay khong the doi mat khau vi la tai khoan Google');
    }

    let passwordHash = user.password_hash ?? user.getDataValue?.('password_hash');
    if (!passwordHash) {
      await user.reload?.({ attributes: { include: ['password_hash'] } });
      passwordHash = user.password_hash ?? user.getDataValue?.('password_hash');
    }

    if (!passwordHash || (typeof passwordHash === 'string' && passwordHash.trim() === '')) {
      throw new ValidationError('Tai khoan khong hop le');
    }

    if (!(user as any).password_hash) {
      (user as any).password_hash = passwordHash;
    }

    const isMatch = await user.comparePassword(input.oldPass);
    if (!isMatch) throw new ValidationError('Mat khau hien tai khong dung');

    const hashedPassword = await this.pwdSvc.hash(input.newPass);
    const updateResult = await this.userRepo.update(
      { password_hash: hashedPassword },
      { where: { id: input.userId } }
    );
    const affectedRows = Array.isArray(updateResult) ? Number(updateResult[0] ?? 0) : Number(updateResult ?? 0);
    if (affectedRows === 0) throw new ValidationError('Khong the cap nhat mat khau');

    return true;
  }
}
