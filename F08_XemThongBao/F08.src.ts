export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface INotificationRepository{
  findAndCountAll(options:any):Promise<{rows:any[];count:number}>;
  findByPk(id:number):Promise<any|null>;
  update(data:any,options:any):Promise<any>;
  destroy(options:any):Promise<number>;
  destroyAll(options:any):Promise<number>;
  countUnread(options:any):Promise<number>;
}
export class NotificationUseCase{
  constructor(private notifRepo:INotificationRepository){}
  async listByUser(input:{userId:number;page?:number;pageSize?:number}){
    const page=input.page||1;const pageSize=input.pageSize||20;const offset=(page-1)*pageSize;
    const result=await this.notifRepo.findAndCountAll({where:{user_id:input.userId},limit:pageSize,offset,order:[['created_at','DESC']]});
    return{rows:result.rows,count:result.count,totalPages:Math.ceil(result.count/pageSize)};}
  async getById(input:{notifId:number;userId:number}){
    const notif=await this.notifRepo.findByPk(input.notifId);if(!notif)throw new NotFoundError('Thông báo không tồn tại');
    if(notif.user_id!==input.userId)throw new ForbiddenError('Không có quyền');return notif;}
  async markAsRead(input:{notifId:number;userId:number}){
    const notif=await this.getById(input);if(notif.user_id!==input.userId)throw new ForbiddenError('Không có quyền');
    await this.notifRepo.update({is_read:true},{where:{id:input.notifId}});
    return{...notif,is_read:true};}
  async deleteOne(input:{notifId:number;userId:number}){
    const notif=await this.getById(input);if(!notif)throw new NotFoundError('Thông báo không tồn tại');
    await this.notifRepo.destroy({where:{id:input.notifId,user_id:input.userId}});return{message:'Xóa thành công'};}
  async deleteAll(input:{userId:number}){
    const count=await this.notifRepo.destroyAll({where:{user_id:input.userId}});return{message:'Xóa tất cả thành công',deletedCount:count};}
  async markAllAsRead(input:{userId:number}){
    const [count]=await this.notifRepo.update({is_read:true},{where:{user_id:input.userId,is_read:false}});return{updatedCount:count};}
  async countUnread(input:{userId:number}){
    const count=await this.notifRepo.countUnread({where:{user_id:input.userId,is_read:false}});return{unreadCount:count};}}