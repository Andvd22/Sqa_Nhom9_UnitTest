import { AdminLoginUseCase, ValidationError, NotFoundError, ForbiddenError, ConflictError, AdminRole, IAdminRepository, IPasswordService } from './F03.src';
function makeAdminRepo(): jest.Mocked<IAdminRepository> { return { findOne: jest.fn() } as any; }
function makePwdSvc(): jest.Mocked<IPasswordService> { return { compare: jest.fn(), hash: jest.fn() } as any; }
let repo: jest.Mocked<IAdminRepository>;
let pwd: jest.Mocked<IPasswordService>;
let uc: AdminLoginUseCase;

describe('AdminLoginUseCase', () => {
  beforeEach(() => {
    
repo = makeAdminRepo();    pwd = makePwdSvc();    uc = new AdminLoginUseCase(repo, pwd);
  });
  it('UT_F03_01: Admin login thành công', async () => { repo.findOne.mockResolvedValue({id:1,email:'admin@e.com',password_hash:'hash',role:AdminRole.ADMIN});pwd.compare.mockResolvedValue(true);const r=await uc.execute({email:'admin@e.com',password:'admin123'});expect(r.role).toBe(AdminRole.ADMIN); });
  it('UT_F03_02: Role user không hợp lệ', async () => { repo.findOne.mockResolvedValue({id:1,email:'user@e.com',password_hash:'hash',role:'user'});pwd.compare.mockResolvedValue(true);await expect(uc.execute({email:'user@e.com',password:'123'})).rejects.toThrow(ForbiddenError); });
  it('UT_F03_03: Sai mật khẩu', async () => { repo.findOne.mockResolvedValue({id:1,email:'admin@e.com',password_hash:'hash',role:AdminRole.ADMIN});pwd.compare.mockResolvedValue(false);await expect(uc.execute({email:'admin@e.com',password:'wrong'})).rejects.toThrow(ValidationError); });
  it('UT_F03_04: Email không tồn tại', async () => { repo.findOne.mockResolvedValue(null);await expect(uc.execute({email:'ghost@e.com',password:'123'})).rejects.toThrow(NotFoundError); });
  it('UT_F03_05: Super admin login', async () => { repo.findOne.mockResolvedValue({id:1,email:'s@e.com',password_hash:'hash',role:AdminRole.SUPER_ADMIN});pwd.compare.mockResolvedValue(true);const r=await uc.execute({email:'s@e.com',password:'123'});expect(r.role).toBe(AdminRole.SUPER_ADMIN); });
  it('UT_F03_06: Employee login', async () => { repo.findOne.mockResolvedValue({id:1,email:'e@e.com',password_hash:'hash',role:AdminRole.EMPLOYEE});pwd.compare.mockResolvedValue(true);const r=await uc.execute({email:'e@e.com',password:'123'});expect(r.role).toBe(AdminRole.EMPLOYEE); });
  it('UT_F03_07: Guide login', async () => { repo.findOne.mockResolvedValue({id:1,email:'g@e.com',password_hash:'hash',role:AdminRole.GUIDE});pwd.compare.mockResolvedValue(true);const r=await uc.execute({email:'g@e.com',password:'123'});expect(r.role).toBe(AdminRole.GUIDE); });
  it('UT_F03_08: Thiếu email', async () => { await expect(uc.execute({email:'',password:'123'} as any)).rejects.toThrow(ValidationError); });
  it('UT_F03_09: Thiếu mật khẩu', async () => { repo.findOne.mockResolvedValue({id:1,email:'a@e.com',password_hash:'hash',role:AdminRole.ADMIN});await expect(uc.execute({email:'a@e.com',password:''})).rejects.toThrow(ValidationError); });
  it('UT_F03_10: Role null', async () => { repo.findOne.mockResolvedValue({id:1,email:'n@e.com',password_hash:'hash',role:null});pwd.compare.mockResolvedValue(true);await expect(uc.execute({email:'n@e.com',password:'123'})).rejects.toThrow(ForbiddenError); });
  it('UT_F03_11: Role undefined', async () => { repo.findOne.mockResolvedValue({id:1,email:'u@e.com',password_hash:'hash',role:undefined});pwd.compare.mockResolvedValue(true);await expect(uc.execute({email:'u@e.com',password:'123'})).rejects.toThrow(ForbiddenError); });
  it('UT_F03_12: Mật khẩu dài 128 ký tự vẫn sai', async () => { repo.findOne.mockResolvedValue({id:1,email:'admin@e.com',password_hash:'hash',role:AdminRole.ADMIN});pwd.compare.mockResolvedValue(false);await expect(uc.execute({email:'admin@e.com',password:'x'.repeat(128)})).rejects.toThrow(ValidationError); });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F03_13 – AdminLoginUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(AdminLoginUseCase); });
  it('UT_F03_14 – AdminLoginUseCase có prototype hợp lệ', () => { expect(AdminLoginUseCase.prototype).toBeDefined(); });
  it('UT_F03_15 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F03_16 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
});
