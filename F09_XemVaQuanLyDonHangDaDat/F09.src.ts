export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IOrderRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; findOne(options:any):Promise<any|null>; }
export class GetUserOrdersUseCase{
  constructor(private orderRepo:IOrderRepository){}
  async execute(input:{userId:number;page?:number;limit?:number}){
    const page=input.page||1;const limit=input.limit||10;const offset=(page-1)*limit;
    const result=await this.orderRepo.findAndCountAll({where:{user_id:input.userId},limit,offset,order:[['created_at','DESC']]});
    return{orders:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}
  async getOrderDetail(input:{userId:number;orderId:number}){
    const order=await this.orderRepo.findOne({where:{id:input.orderId}});if(!order)throw new NotFoundError('Đơn hàng không tồn tại');
    if(order.user_id!==input.userId)throw new ForbiddenError('Không có quyền xem đơn hàng này');return order;}}
