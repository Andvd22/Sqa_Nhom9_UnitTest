export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface IUserRepository{ findByPk(id:number):Promise<any|null>; }
export interface IFeedbackRepository{ create(data:any):Promise<any>; findAndCountAll(options:any):Promise<{rows:any[];count:number}>; findOne(options:any):Promise<any|null>; update(data:any,options:any):Promise<any>; }
export class FeedbackSystemUseCase{
  constructor(private userRepo:IUserRepository,private fbRepo:IFeedbackRepository){}
  async createFeedback(input:{title:string;message:string;userId:number}){
    const user=await this.userRepo.findByPk(input.userId);if(!user)throw new NotFoundError('Người dùng không tồn tại');
    if(!input.title?.trim()||!input.message?.trim())throw new ValidationError('Tiêu đề và nội dung không được để trống');
    if(input.title.trim().length<5)throw new ValidationError('Tiêu đề phải có ít nhất 5 ký tự');
    return this.fbRepo.create({title:input.title.trim(),message:input.message.trim(),user_id:input.userId,status:'open'});}
  async replyFeedback(input:{feedbackId:number;replyMessage:string;adminId:number}){
    const fb=await this.fbRepo.findOne({where:{id:input.feedbackId}});if(!fb)throw new NotFoundError('Feedback không tồn tại');
    if(fb.status==='closed')throw new ForbiddenError('Feedback đã đóng');
    if(!input.replyMessage?.trim())throw new ValidationError('Nội dung trả lời không được để trống');
    return this.fbRepo.update({reply:input.replyMessage.trim(),replied_by:input.adminId,status:'replied'},{where:{id:input.feedbackId}});}
  async getFeedbacks(input:{page?:number;limit?:number;search?:string}){
    const page=input.page||1;const limit=input.limit||10;const offset=(page-1)*limit;const where:any={};
    if(input.search)where['title']={like:`%${input.search}%`};
    const result=await this.fbRepo.findAndCountAll({where,limit,offset,order:[['created_at','DESC']]});
    return{items:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}
  async closeFeedback(input:{feedbackId:number}){
    const fb=await this.fbRepo.findOne({where:{id:input.feedbackId}});if(!fb)throw new NotFoundError('Feedback không tồn tại');
    if(fb.status==='closed')throw new ValidationError('Feedback đã đóng');
    return this.fbRepo.update({status:'closed',closed_at:new Date()},{where:{id:input.feedbackId}});}}
