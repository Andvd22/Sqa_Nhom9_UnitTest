export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export interface IUserRepository{ findOne(options:any):Promise<any|null>; }
export interface IPasswordService{ compare(plain:string,hash:string):Promise<boolean>; }
export class LoginUseCase{
  constructor(private userRepo:IUserRepository,private pwdSvc:IPasswordService){}
  async execute(input:{email:string;password:string}){
    if(!input.email||!input.password) throw new ValidationError('Thiếu thông tin');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new ValidationError('Email không hợp lệ');
    const user=await this.userRepo.findOne({where:{email:input.email}});if(!user) throw new NotFoundError('Email không tồn tại');
    if(!user.is_active) throw new ForbiddenError('Tài khoản đã bị khóa');
    const valid=await this.pwdSvc.compare(input.password,user.password_hash);if(!valid) throw new ValidationError('Mật khẩu không đúng');
    return {token:'jwt-token',user:{id:user.id,email:user.email}};}}
