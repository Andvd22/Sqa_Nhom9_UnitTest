export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface ICouponRepository{ create(data:any):Promise<any>; findOne(options:any):Promise<any|null>; findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; }
export type DiscountType = 'percent'|'fixed';
export class CouponManagementUseCase{
  constructor(private couponRepo:ICouponRepository){}
  async createCoupon(input:{code:string;discount_type:DiscountType;discount_amount:number;start_date:Date;end_date:Date}){
    if(!input.code?.trim())throw new ValidationError('Mã không được để trống');
    if(input.discount_type==='percent'&&(input.discount_amount<=0||input.discount_amount>100))throw new ValidationError('Phần trăm giảm giá từ 1-100');
    if(input.discount_type==='fixed'&&input.discount_amount<=0)throw new ValidationError('Số tiền giảm phải > 0');
    if(new Date(input.end_date)<=new Date(input.start_date))throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
    const existing=await this.couponRepo.findOne({where:{code:input.code.trim()}});if(existing)throw new ConflictError('Mã đã tồn tại');
    const coupon=await this.couponRepo.create({...input,code:input.code.trim()});return coupon;}
  async updateCoupon(input:{couponId:number;discount_amount?:number;end_date?:Date;is_active?:boolean}){
    const coupon=await this.couponRepo.findByPk(input.couponId);if(!coupon)throw new NotFoundError('Mã không tồn tại');
    if(input.discount_amount!==undefined&&coupon.discount_type==='percent'&&input.discount_amount>100)throw new ValidationError('Phần trăm <= 100');
    if(input.end_date!==undefined&&new Date(input.end_date)<=new Date())throw new ValidationError('Ngày kết thúc phải sau hiện tại');
    await this.couponRepo.update({...input},{where:{id:input.couponId}});return{message:'Cập nhật thành công'};}
  async deleteCoupon(couponId:number){
    const coupon=await this.couponRepo.findByPk(couponId);if(!coupon)throw new NotFoundError('Mã không tồn tại');
    if(coupon.is_used)throw new ConflictError('Mã đã được sử dụng');
    await this.couponRepo.update({deleted_at:new Date()},{where:{id:couponId}});return{message:'Xóa thành công'};}
  async getCoupon(input:{code:string}){
    const coupon=await this.couponRepo.findOne({where:{code:input.code.trim()}});if(!coupon)throw new NotFoundError('Mã không tồn tại');
    if(new Date(coupon.end_date)<=new Date())throw new ValidationError('Mã đã hết hạn');
    if(!coupon.is_active)throw new ValidationError('Mã đã bị vô hiệu hóa');return coupon;}
  async applyCoupon(input:{code:string;totalPrice:number}){
    const coupon=await this.getCoupon({code:input.code});
    let newPrice=input.totalPrice;
    if(coupon.discount_type==='percent')newPrice-=input.totalPrice*(coupon.discount_amount/100);else newPrice-=coupon.discount_amount;
    if(newPrice<0)newPrice=0;return{newPrice,originalPrice:input.totalPrice};}}
