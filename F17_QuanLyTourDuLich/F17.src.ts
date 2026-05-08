export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface ITourRepository{ create(data:any):Promise<any>; findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; findOne(options:any):Promise<any|null>; }
export interface IOrderRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; }
export class TourManagementUseCase{
  constructor(private tourRepo:ITourRepository,private orderRepo:IOrderRepository){}
  async createTour(input:{title:string;price:number;capacity:number;categoryId:number}){
    if(!input.title?.trim())throw new ValidationError('Tên tour không được để trống');
    if(input.price<=0)throw new ValidationError('Giá phải > 0');
    if(input.capacity<=0)throw new ValidationError('Sức chứa phải > 0');
    const tour=await this.tourRepo.create(input);return tour;}
  async updateTour(input:{tourId:number;price?:number;capacity?:number;title?:string}){
    const tour=await this.tourRepo.findByPk(input.tourId);if(!tour)throw new NotFoundError('Tour không tồn tại');
    if(input.price!==undefined&&input.price<=0)throw new ValidationError('Giá phải > 0');
    if(input.capacity!==undefined&&input.capacity<=0)throw new ValidationError('Sức chứa phải > 0');
    await this.tourRepo.update({...input},{where:{id:input.tourId}});return{message:'Cập nhật thành công'};}
  async deleteTour(tourId:number){
    const tour=await this.tourRepo.findByPk(tourId);if(!tour)throw new NotFoundError('Tour không tồn tại');
    const orders=await this.orderRepo.findAndCountAll({where:{tour_id:tourId}});
    if(orders.count>0)throw new ConflictError('Tour có đơn hàng, không thể xóa');
    await this.tourRepo.update({deleted_at:new Date()},{where:{id:tourId}});return{message:'Xóa thành công'};}}
