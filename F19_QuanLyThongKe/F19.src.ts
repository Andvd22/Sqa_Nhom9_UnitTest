export interface IOrderRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; }
export interface IUserRepository{ findAndCountAll(options:any):Promise<{rows:any[];count:number}>; }
export class StatisticsUseCase{
  constructor(private orderRepo:IOrderRepository,private userRepo:IUserRepository){}
  async revenueByMonth(input:{year:number;month:number}){
    const start=new Date(input.year,input.month-1,1);const end=new Date(input.year,input.month,1);
    const result=await this.orderRepo.findAndCountAll({where:{status:'completed',created_at:{gte:start,lt:end}}});
    const total=result.rows.reduce((sum,o)=>sum+(o.total_price||0),0);return{month:input.month,year:input.year,totalRevenue:total,orderCount:result.count};}
  async newUsersByMonth(input:{year:number;month:number}){
    const start=new Date(input.year,input.month-1,1);const end=new Date(input.year,input.month,1);
    const result=await this.userRepo.findAndCountAll({where:{created_at:{gte:start,lt:end}}});
    return{month:input.month,year:input.year,newUsers:result.count};}
  async topTours(input:{limit?:number}){
    const limit=input.limit||5;
    const result=await this.orderRepo.findAndCountAll({where:{status:'completed'},group:'tour_id',order:[['total_price','DESC']],limit});
    return{tours:result.rows};}
  async revenueByYear(year:number){
    const start=new Date(year,0,1);const end=new Date(year+1,0,1);
    const result=await this.orderRepo.findAndCountAll({where:{status:'completed',created_at:{gte:start,lt:end}}});
    const total=result.rows.reduce((sum,o)=>sum+(o.total_price||0),0);return{year,totalRevenue:total,orderCount:result.count};}}
