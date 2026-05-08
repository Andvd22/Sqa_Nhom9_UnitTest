export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export enum AdminRole{ SUPER_ADMIN='super_admin',ADMIN='admin',EMPLOYEE='employee',GUIDE='guide' }
export interface IUserRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; findByPk(id:number):Promise<any|null>; findOne(options:any):Promise<any|null>; update(data:any,options:any):Promise<any>; create(data:any):Promise<any>; }
export interface IPasswordService{ hash(password:string):Promise<string>; }
export class UserManagementUseCase{
  constructor(private userRepo:IUserRepository,private pwdSvc:IPasswordService){}
  async getUsers(input:{page?:number;limit?:number;role?:string;isActive?:boolean}){
    const page=input.page||1;const limit=input.limit||10;const offset=(page-1)*limit;const where:any={};
    if(input.role)where.role=input.role;if(input.isActive!==undefined)where.is_active=input.isActive;
    const result=await this.userRepo.findAndCountAll({where,limit,offset,order:[['created_at','DESC']]});
    return{users:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}
  async banUser(userId:number){const user=await this.userRepo.findByPk(userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');if(!user.is_active)throw new ValidationError('Người dùng đã bị khóa');await this.userRepo.update({is_active:false},{where:{id:userId}});return{message:'Khóa thành công'};}
  async updateUser(input:{userId:number;email?:string;username?:string;full_name?:string}){
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    if(input.email){const e=await this.userRepo.findOne({where:{email:input.email}});if(e&&e.id!==input.userId)throw new ConflictError('Email đã tồn tại');}
    if(input.username){const e=await this.userRepo.findOne({where:{username:input.username}});if(e&&e.id!==input.userId)throw new ConflictError('Username đã tồn tại');}
    await this.userRepo.update({...input},{where:{id:input.userId}});return{message:'Cập nhật thành công'};}
  async createAdmin(input:{email:string;username:string;password:string;role:AdminRole}){
    if(!input.email||!input.username||!input.password)throw new ValidationError('Thiếu thông tin');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))throw new ValidationError('Email không hợp lệ');
    if(input.password.length<6)throw new ValidationError('Password >= 6 ký tự');
    const e=await this.userRepo.findOne({where:{email:input.email}});if(e)throw new ConflictError('Email đã tồn tại');
    const u=await this.userRepo.findOne({where:{username:input.username}});if(u)throw new ConflictError('Username đã tồn tại');
    const allowed=[AdminRole.SUPER_ADMIN,AdminRole.ADMIN,AdminRole.EMPLOYEE,AdminRole.GUIDE];if(!allowed.includes(input.role))throw new ValidationError('Role không hợp lệ');
    const hash=await this.pwdSvc.hash(input.password);const user=await this.userRepo.create({...input,password_hash:hash,is_active:true});return user;}
  async changeRole(input:{userId:number;newRole:AdminRole;requesterRole:AdminRole}){
    if(input.requesterRole!==AdminRole.SUPER_ADMIN)throw new ForbiddenError('Chỉ SUPER_ADMIN đổi role');
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    await this.userRepo.update({role:input.newRole},{where:{id:input.userId}});return{message:'Đổi role thành công'};}
  async resetPassword(input:{userId:number;newPassword:string;requesterRole:AdminRole}){
    if(input.requesterRole!==AdminRole.SUPER_ADMIN&&input.requesterRole!==AdminRole.ADMIN)throw new ForbiddenError('Không có quyền');
    if(input.newPassword.length<6)throw new ValidationError('Password >= 6 ký tự');
    const hash=await this.pwdSvc.hash(input.newPassword);await this.userRepo.update({password_hash:hash},{where:{id:input.userId}});return{message:'Reset thành công'};}}
