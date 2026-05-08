export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}

export interface ITourRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; findOne(options:any):Promise<any|null>; }
export interface ICategoryRepository{ findByPk(id:number):Promise<any|null>; }

export class GetToursUseCase{
  constructor(private tourRepo:ITourRepository,private catRepo:ICategoryRepository){}
  async execute(input:{page?:number;limit?:number;categoryId?:number;isActive?:boolean}){
    const page=input.page||1;
    const limit=input.limit||10;
    const offset=(page-1)*limit;
    const where:any={};
    if(input.isActive!==undefined)where.is_active=input.isActive;
    if(input.categoryId){
      const cat=await this.catRepo.findByPk(input.categoryId);
      if(!cat)throw new NotFoundError('Danh mục không tồn tại');
      where.category_id=input.categoryId;
    }
    const result=await this.tourRepo.findAndCountAll({where,limit,offset,order:[['created_at','DESC']]});
    return{tours:result.rows,pagination:{page,limit,total:result.count,totalPages:Math.ceil(result.count/limit)}};}}