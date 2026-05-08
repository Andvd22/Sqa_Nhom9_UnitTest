export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IOrderRepository{ findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; }
export interface IPaymentGateway{ createPaymentLink(amount:number,orderId:number):Promise<{url:string}>; }
export class PaymentUseCase{
  constructor(private orderRepo:IOrderRepository,private gateway:IPaymentGateway){}
  async createPayment(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn hàng không tồn tại');
    if(order.total_price<10000)throw new ValidationError('Giá trị đơn hàng phải từ 10,000đ');
    if(order.total_price>50000000)throw new ValidationError('Giá trị đơn hàng tối đa 50,000,000đ');
    if(order.is_paid)throw new ValidationError('Đơn hàng đã thanh toán');
    const link=await this.gateway.createPaymentLink(order.total_price,order.id);return{paymentUrl:link.url,amount:order.total_price};}
  async verifyPayment(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn hàng không tồn tại');return{isPaid:!!order.is_paid,paidAt:order.paid_at};}}
