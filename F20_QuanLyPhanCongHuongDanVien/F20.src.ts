export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IUserRepository{ findByPk(id:number):Promise<any|null>; }
export interface ITourRepository{ findByPk(id:number):Promise<any|null>; }
export interface IAssignmentRepository{ create(data:any):Promise<any>; findOne(options:any):Promise<any|null>; findAndCountAll(options:any):Promise<{rows:any[];count:number}>; update(data:any,options:any):Promise<any>; }
export class GuideAssignmentUseCase{
  constructor(private userRepo:IUserRepository,private tourRepo:ITourRepository,private assignRepo:IAssignmentRepository){}
  async assignGuide(input:{tourId:number;guideId:number;startDate:Date;endDate:Date}){
    const guide=await this.userRepo.findByPk(input.guideId);if(!guide||guide.role!=='guide')throw new NotFoundError('Hướng dẫn viên không tồn tại');
    const tour=await this.tourRepo.findByPk(input.tourId);if(!tour)throw new NotFoundError('Tour không tồn tại');
    if(new Date(input.endDate)<=new Date(input.startDate))throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
    const overlap=await this.assignRepo.findOne({where:{guide_id:input.guideId,start_date:{lte:input.endDate},end_date:{gte:input.startDate}}});
    if(overlap)throw new ConflictError('Hướng dẫn viên đã có lịch trong khoảng này');
    return this.assignRepo.create({tour_id:input.tourId,guide_id:input.guideId,start_date:input.startDate,end_date:input.endDate});}
  async removeGuide(tourId:number){
    const assign=await this.assignRepo.findOne({where:{tour_id:tourId}});if(!assign)throw new NotFoundError('Phân công không tồn tại');
    await this.assignRepo.update({removed_at:new Date()},{where:{id:assign.id}});return{message:'Gỡ HDV thành công'};}
  async getGuideSchedule(input:{guideId:number;page?:number;limit?:number}){
    const page=input.page||1;const limit=input.limit||10;const offset=(page-1)*limit;
    const result=await this.assignRepo.findAndCountAll({where:{guide_id:input.guideId},limit,offset,order:[['start_date','ASC']]});
    return{assignments:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}}
