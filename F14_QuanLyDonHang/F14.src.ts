export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IOrderRepository{ create(data:any):Promise<any>; findOne(options:any):Promise<any|null>; findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; findAndCountAll(options:any):Promise<{rows:any[];count:number}>; }
export interface ITourRepository{ findByPk(id:number):Promise<any|null>; }
export interface ICouponRepository{ findOne(options:any):Promise<any|null>; }
export class AdminOrderManagementUseCase{
  constructor(private orderRepo:IOrderRepository,private tourRepo:ITourRepository,private couponRepo:ICouponRepository){}
  async createOrder(input:any){
    const tour=await this.tourRepo.findByPk(input.tourId);if(!tour)throw new NotFoundError('Tour không tồn tại');
    if(input.quantity<=0)throw new ValidationError('Số lượng phải > 0');
    if(input.quantity> tour.capacity)throw new ValidationError('Vượt quá sức chứa');
    const s=new Date(input.startDate);s.setHours(0,0,0,0);const today=new Date();today.setHours(0,0,0,0);const daysDiff=Math.ceil((s.getTime()-today.getTime())/86400000);if(daysDiff<2)throw new ValidationError('Phải đặt trước ít nhất 2 ngày');
    let total=tour.price*input.quantity;
    if(input.couponCode){const coupon=await this.couponRepo.findOne({where:{code:input.couponCode}});if(!coupon)throw new NotFoundError('Mã giảm giá không tồn tại');if(new Date(coupon.end_date)<new Date())throw new ValidationError('Mã đã hết hạn');if(coupon.discount_type==='percent'){total-=total*(coupon.discount_amount/100);}else{total-=coupon.discount_amount;}}
    const order=await this.orderRepo.create({...input,total_price:total,status:'pending'});return{orderId:order.id,total:total};}
  async cancelOrder(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn không tồn tại');
    if(order.status==='cancelled')throw new ValidationError('Đơn đã hủy');if(order.status==='completed')throw new ValidationError('Đơn đã hoàn thành');
    await this.orderRepo.update({status:'cancelled'},{where:{id:input.orderId}});return{message:'Hủy đơn thành công'};}
  async confirmOrder(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn không tồn tại');
    if(order.status!=='pending')throw new ValidationError('Chỉ xác nhận đơn pending');
    await this.orderRepo.update({status:'confirmed'},{where:{id:input.orderId}});return{message:'Xác nhận đơn thành công'};}
  async completeOrder(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn không tồn tại');
    await this.orderRepo.update({status:'completed'},{where:{id:input.orderId}});return{message:'Hoàn thành đơn'};}
  async getOrderDetail(input:{orderId:number}){
    const order=await this.orderRepo.findByPk(input.orderId);if(!order)throw new NotFoundError('Đơn không tồn tại');return order;}
  async getOrders(input:{page?:number;limit?:number;status?:string}){
    const page=input.page||1;const limit=input.limit||10;const offset=(page-1)*limit;const where:any={};if(input.status)where.status=input.status;
    const result=await this.orderRepo.findAndCountAll({where,limit,offset,order:[['created_at','DESC']]});
    return{orders:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}}
