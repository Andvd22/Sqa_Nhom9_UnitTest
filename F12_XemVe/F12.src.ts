export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IOrderRepository{ findByPk(id:number):Promise<any|null>; }
export class GetTicketUseCase{
  constructor(private orderRepo:IOrderRepository){}
  async execute(input:{userId:number;orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn hàng không tồn tại');
    if(order.user_id!==input.userId)throw new ForbiddenError('Không có quyền xem vé này');
    if(order.status!=='completed'&&order.status!=='paid')throw new ValidationError('Đơn hàng chưa hoàn thành thanh toán');
    return{ticketCode:`TKT-${order.id}`,tourName:order.tour_name,quantity:order.quantity,totalPrice:order.total_price};}}
