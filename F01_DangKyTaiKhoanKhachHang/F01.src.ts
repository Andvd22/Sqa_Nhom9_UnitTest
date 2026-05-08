export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export function isValidEmail(email:string):boolean{ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export interface IUserRepository{ findOne(options:any):Promise<any|null>; create(data:any):Promise<any>; findByPk(id:number):Promise<any|null>; }
export interface RegisterInput{ username:string; email:string; password:string; phone?:string; }
export class RegisterUserUseCase{
  constructor(private userRepo:IUserRepository){}
  async execute(input:RegisterInput){
    if(!input.username||!input.email||!input.password) throw new ValidationError('Thiếu thông tin');
    if(input.username.trim().length<3) throw new ValidationError('Username >= 3 ký tự');
    if(input.username.trim().length>50) throw new ValidationError('Username <= 50 ký tự');
    if(!isValidEmail(input.email)) throw new ValidationError('Email không hợp lệ');
    if(input.password.length<6) throw new ValidationError('Password >= 6 ký tự');
    if(input.password.length>128) throw new ValidationError('Password <= 128 ký tự');
    if(input.phone&&input.phone.length&&!/^[0-9]{10,11}$/.test(input.phone)) throw new ValidationError('SĐT không hợp lệ');
    const existingEmail=await this.userRepo.findOne({where:{email:input.email.trim()}});if(existingEmail) throw new ConflictError('Email đã được sử dụng');
    const existingUser=await this.userRepo.findOne({where:{username:input.username.trim()}});if(existingUser) throw new ConflictError('Username đã được sử dụng');
    const user=await this.userRepo.create({username:input.username.trim(),email:input.email.trim(),password_hash:'hashed',is_active:true});
    return {id:user.id,username:user.username,email:user.email,is_active:true};}}
