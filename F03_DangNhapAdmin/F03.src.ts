export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export enum AdminRole{ SUPER_ADMIN='super_admin',ADMIN='admin',EMPLOYEE='employee',GUIDE='guide' }
export interface IAdminRepository{ findOne(options:any):Promise<any|null>; }
export interface IPasswordService{ compare(plain:string,hash:string):Promise<boolean>; }
export class AdminLoginUseCase{
  constructor(private adminRepo:IAdminRepository,private pwdSvc:IPasswordService){}
  async execute(input:{email:string;password:string}){
    if(!input.email||!input.password) throw new ValidationError('Thiếu thông tin');
    const admin=await this.adminRepo.findOne({where:{email:input.email}});if(!admin) throw new NotFoundError('Email không tồn tại');
    const valid=await this.pwdSvc.compare(input.password,admin.password_hash);if(!valid) throw new ValidationError('Mật khẩu không đúng');
    const allowed=[AdminRole.SUPER_ADMIN,AdminRole.ADMIN,AdminRole.EMPLOYEE,AdminRole.GUIDE];if(!allowed.includes(admin.role)) throw new ForbiddenError('Không có quyền truy cập');
    return {token:'admin-jwt',role:admin.role};}}
