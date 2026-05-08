export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export interface ITourRepository{ findByPk(id:number,options?:any):Promise<any|null>; }
export class GetTourByIdUseCase{
  constructor(private tourRepo:ITourRepository){}
  async execute(input:{tourId:number}){
    if(input.tourId<=0)throw new ValidationError('ID tour không hợp lệ');
    const tour=await this.tourRepo.findByPk(input.tourId,{include:['Guide']});if(!tour)throw new NotFoundError('Tour không tồn tại');return tour;}}
