export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IUserRepository{ findByPk(id:number):Promise<any|null>; }
export interface ITourRepository{ findByPk(id:number):Promise<any|null>; }
export interface IOrderRepository{ create(data:any):Promise<any>; }
export class CreateOrderUseCase{
  constructor(private userRepo:IUserRepository,private tourRepo:ITourRepository,private orderRepo:IOrderRepository){}
  async execute(input:{userId:number;tourId:number;quantity:number;startDate:Date}){
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    const tour=await this.tourRepo.findByPk(input.tourId);if(!tour)throw new NotFoundError('Tour không tồn tại');
    if(input.quantity<=0)throw new ValidationError('Số lượng phải lớn hơn 0');
    if(input.quantity> tour.capacity)throw new ValidationError('Số lượng vượt quá sức chứa');
    const today=new Date();today.setHours(0,0,0,0);const s=new Date(input.startDate);s.setHours(0,0,0,0);
    const daysDiff=Math.ceil((s.getTime()-today.getTime())/86400000);if(daysDiff<2)throw new ValidationError('Ngày khởi hành phải cách ít nhất 2 ngày');
    const totalPrice=tour.price*input.quantity;const order=await this.orderRepo.create({user_id:input.userId,tour_id:input.tourId,quantity:input.quantity,total_price:totalPrice,status:'pending'});
    return{orderId:order.id,totalPrice,status:'pending'};}}
