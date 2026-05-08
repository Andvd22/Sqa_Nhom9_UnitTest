export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export function isValidEmail(email:string):boolean{ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export interface IUserRepository{ findByPk(id:number):Promise<any|null>; findOne(options:any):Promise<any|null>; update(data:any,options:any):Promise<any>; }
export class UpdateUserInfoUseCase{
  constructor(private userRepo:IUserRepository){}
  async execute(input:{userId:number;email?:string;phone?:string;username?:string;avatar?:string}){
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    if(input.email&&input.email!==user.email){const e=await this.userRepo.findOne({where:{email:input.email}});if(e)throw new ConflictError('Email đã được sử dụng');if(!isValidEmail(input.email))throw new ValidationError('Email không hợp lệ');}
    if(input.username&&input.username!==user.username){const e=await this.userRepo.findOne({where:{username:input.username}});if(e)throw new ConflictError('Username đã được sử dụng');if(input.username.trim().length<3)throw new ValidationError('Username >= 3 ký tự');}
    if(input.phone&&!/^[0-9]{10,11}$/.test(input.phone))throw new ValidationError('SĐT không hợp lệ');
    const updateData:any={};if(input.phone!==undefined)updateData.phone=input.phone;if(input.email!==undefined)updateData.email=input.email;if(input.username!==undefined)updateData.username=input.username;if(input.avatar!==undefined)updateData.avatar=input.avatar;
    if(Object.keys(updateData).length===0)throw new ValidationError('Không có dữ liệu để cập nhật');
    await this.userRepo.update(updateData,{where:{id:input.userId}});return{...user,...updateData};}}
