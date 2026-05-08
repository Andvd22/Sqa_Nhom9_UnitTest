export class AppError extends Error{constructor(msg:string,public statusCode=500){super(msg);this.name='AppError';}}
export class ValidationError extends AppError{constructor(m:string){super(m,400);this.name='ValidationError';}}
export class NotFoundError extends AppError{constructor(m:string){super(m,404);this.name='NotFoundError';}}
export class ForbiddenError extends AppError{constructor(m:string){super(m,403);this.name='ForbiddenError';}}
export class ConflictError extends AppError{constructor(m:string){super(m,409);this.name='ConflictError';}}
export interface ICategoryRepository{ create(data:any):Promise<any>; findByPk(id:number):Promise<any|null>; update(data:any,options:any):Promise<any>; findOne(options:any):Promise<any|null>; }
export interface ITourRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; }
export class CategoryManagementUseCase{
  constructor(private catRepo:ICategoryRepository,private tourRepo:ITourRepository){}
  async createCategory(input:{name:string;description?:string}){
    if(!input.name?.trim())throw new ValidationError('Tên danh mục không được để trống');
    if(input.name.trim().length<2)throw new ValidationError('Tên danh mục phải có ít nhất 2 ký tự');
    const existing=await this.catRepo.findOne({where:{name:input.name.trim()}});if(existing)throw new ConflictError('Danh mục đã tồn tại');
    return this.catRepo.create({...input,name:input.name.trim()});}
  async updateCategory(input:{categoryId:number;name?:string}){
    const cat=await this.catRepo.findByPk(input.categoryId);if(!cat)throw new NotFoundError('Danh mục không tồn tại');
    if(input.name){const e=await this.catRepo.findOne({where:{name:input.name.trim()}});if(e&&e.id!==input.categoryId)throw new ConflictError('Tên đã tồn tại');}
    await this.catRepo.update({...input},{where:{id:input.categoryId}});return{message:'Cập nhật thành công'};}
  async deleteCategory(categoryId:number){
    const cat=await this.catRepo.findByPk(categoryId);if(!cat)throw new NotFoundError('Danh mục không tồn tại');
    const tours=await this.tourRepo.findAndCountAll({where:{category_id:categoryId}});
    if(tours.count>0)throw new ConflictError('Danh mục có tour, không thể xóa');
    await this.catRepo.update({deleted_at:new Date()},{where:{id:categoryId}});return{message:'Xóa thành công'};}}
