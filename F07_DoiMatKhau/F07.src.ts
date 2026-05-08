export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export interface IUserRepository{ findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; }
export interface IPasswordService{ compare(plain:string,hash:string):Promise<boolean>; hash(password:string):Promise<string>; }
export class ChangePasswordUseCase{
  constructor(private userRepo:IUserRepository,private pwdSvc:IPasswordService){}
  async execute(input:{userId:number;oldPass:string;newPass:string;confirmPass?:string}){
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    const valid=await this.pwdSvc.compare(input.oldPass,user.password_hash);if(!valid)throw new ValidationError('Mật khẩu cũ không đúng');
    if(input.newPass.length<6)throw new ValidationError('Mật khẩu mới >= 6 ký tự');
    if(input.newPass.length>128)throw new ValidationError('Mật khẩu mới <= 128 ký tự');
    if(input.confirmPass!==undefined && input.newPass!==input.confirmPass)throw new ValidationError('Xác nhận mật khẩu không khớp');
    if(input.newPass===input.oldPass)throw new ValidationError('Mật khẩu mới phải khác mật khẩu cũ');
    const hash=await this.pwdSvc.hash(input.newPass);await this.userRepo.update({password_hash:hash},{where:{id:input.userId}});return{message:'Đổi mật khẩu thành công'};}}
