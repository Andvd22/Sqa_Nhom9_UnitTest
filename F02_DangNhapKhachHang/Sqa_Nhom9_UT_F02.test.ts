/**
 * @file Sqa_Nhom9_UT_F02.test.ts
 * @module F02_DangNhapKhachHang
 * @description Unit tests for LoginUseCase - F02: Đăng nhập khách hàng
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Đăng nhập thành công với email/password đúng
 *  - Đăng nhập thất bại khi email không tồn tại
 *  - Đăng nhập thất bại khi mật khẩu sai
 *  - Đăng nhập thất bại khi tài khoản bị khóa / chưa active
 *  - Validation email định dạng
 *  - Kiểm tra thiếu thông tin
 *  - Xác minh các service được gọi đúng số lần
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  LoginUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  IUserRepository,
  IPasswordService,
} from './F02.src';

// =====================================================================
// HELPERS – factory functions for mock repository & password service
// =====================================================================
const makeUserRepo = (): jest.Mocked<IUserRepository> => {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  } as any;
};

const makePwdSvc = (): jest.Mocked<IPasswordService> => {
  return {
    compare: jest.fn(),
    hash: jest.fn(),
  } as any;
};

// =====================================================================
// TEST SUITE
// =====================================================================
describe('F02 - Đăng nhập khách hàng | LoginUseCase', () => {
  let repo: jest.Mocked<IUserRepository>;
  let pwd: jest.Mocked<IPasswordService>;
  let uc: LoginUseCase;

  beforeEach(() => {
    repo = makeUserRepo();
    pwd = makePwdSvc();
    uc = new LoginUseCase(repo, pwd);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_01
  // -------------------------------------------------------------------
  it('UT_F02_01 – Đăng nhập thành công với email và mật khẩu đúng', async () => {
    /**
     * Test Case ID : UT_F02_01
     * Test Objective: Xác minh luồng đăng nhập thành công
     * Input         : email="a@b.com", password="123456"
     * Expected Output: Trả về { user, token: "jwt-token" }
     * Notes         : CheckDB – findOne() được gọi đúng 1 lần với email
     *                 CheckDB – compare() được gọi với đúng (plain, hash)
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(result.token).toBe('jwt-token');
    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe('a@b.com');
    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    expect(pwd.compare).toHaveBeenCalledWith('123456', 'hash');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_02
  // -------------------------------------------------------------------
  it('UT_F02_02 – Đăng nhập thất bại khi mật khẩu không đúng', async () => {
    /**
     * Test Case ID : UT_F02_02
     * Test Objective: Xác minh ValidationError khi mật khẩu sai
     * Input         : email đúng, password="wrong"
     * Expected Output: ValidationError "Mật khẩu không đúng"
     * Notes         : compare() trả về false
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(false);

    await expect(
      uc.execute({ email: 'a@b.com', password: 'wrong' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_03
  // -------------------------------------------------------------------
  it('UT_F02_03 – Đăng nhập thất bại khi email không tồn tại', async () => {
    /**
     * Test Case ID : UT_F02_03
     * Test Objective: Xác minh NotFoundError khi email không có trong DB
     * Input         : email="ghost@b.com" (không có trong DB)
     * Expected Output: NotFoundError "Email không tồn tại"
     * Notes         : CheckDB – compare() KHÔNG được gọi
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.execute({ email: 'ghost@b.com', password: '123456' })
    ).rejects.toThrow(NotFoundError);

    expect(pwd.compare).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_04
  // -------------------------------------------------------------------
  it('UT_F02_04 – Đăng nhập thất bại khi tài khoản bị khóa', async () => {
    /**
     * Test Case ID : UT_F02_04
     * Test Objective: Xác minh ForbiddenError khi tài khoản is_active=false
     * Input         : email="locked@b.com", is_active=false
     * Expected Output: ForbiddenError "Tài khoản đã bị khóa"
     * Notes         : CheckDB – compare() KHÔNG được gọi (tối ưu bảo mật)
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'locked@b.com',
      password_hash: 'hash',
      is_active: false,
    });

    await expect(
      uc.execute({ email: 'locked@b.com', password: '123456' })
    ).rejects.toThrow(ForbiddenError);

    expect(pwd.compare).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_05
  // -------------------------------------------------------------------
  it('UT_F02_05 – Đăng nhập thất bại khi thiếu thông tin', async () => {
    /**
     * Test Case ID : UT_F02_05
     * Test Objective: Xác minh ValidationError khi email hoặc password rỗng
     * Input         : email="", password=""
     * Expected Output: ValidationError "Thiếu thông tin"
     * Notes         : Không query DB khi thiếu thông tin
     */
    await expect(
      uc.execute({ email: '', password: '' } as any)
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_06
  // -------------------------------------------------------------------
  it('UT_F02_06 – Đăng nhập thất bại khi email sai định dạng', async () => {
    /**
     * Test Case ID : UT_F02_06
     * Test Objective: Xác minh ValidationError khi email không hợp lệ
     * Input         : email="invalid.com"
     * Expected Output: ValidationError "Email không hợp lệ"
     */
    await expect(
      uc.execute({ email: 'invalid.com', password: '123456' })
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_07
  // -------------------------------------------------------------------
  it('UT_F02_07 – Đăng nhập thất bại khi mật khẩu rỗng', async () => {
    /**
     * Test Case ID : UT_F02_07
     * Test Objective: Xác minh ValidationError khi password rỗng
     * Input         : email="a@b.com", password=""
     * Expected Output: ValidationError "Thiếu thông tin"
     */
    await expect(
      uc.execute({ email: 'a@b.com', password: '' })
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_08
  // -------------------------------------------------------------------
  it('UT_F02_08 – Đăng nhập thành công với email viết hoa', async () => {
    /**
     * Test Case ID : UT_F02_08
     * Test Objective: Xác minh email viết hoa vẫn đăng nhập được (case-insensitive trong DB)
     * Input         : email="A@B.COM"
     * Expected Output: Đăng nhập thành công
     * Notes         : Email viết hoa vẫn được DB tìm thấy
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'A@B.COM', password: '123456' });

    expect(result.token).toBe('jwt-token');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'A@B.COM' } });
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_09
  // -------------------------------------------------------------------
  it('UT_F02_09 – Đăng nhập thất bại khi tài khoản chưa active', async () => {
    /**
     * Test Case ID : UT_F02_09
     * Test Objective: Xác minh ForbiddenError khi tài khoản chưa được kích hoạt
     * Input         : is_active=false
     * Expected Output: ForbiddenError
     * Notes         : Tương tự tài khoản bị khóa
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'unact@b.com',
      password_hash: 'hash',
      is_active: false,
    });

    await expect(
      uc.execute({ email: 'unact@b.com', password: '123456' })
    ).rejects.toThrow(ForbiddenError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_10
  // -------------------------------------------------------------------
  it('UT_F02_10 – Đăng nhập thành công với email được trim', async () => {
    /**
     * Test Case ID : UT_F02_10
     * Test Objective: Xác minh email sau khi trim vẫn đăng nhập thành công
     * Input         : email="a@b.com" (đã trim từ FE)
     * Expected Output: Đăng nhập thành công
     * Notes         : FE nên trim trước khi gửi, BE validate theo regex chuẩn
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(result.token).toBe('jwt-token');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_11
  // -------------------------------------------------------------------
  it('UT_F02_11 – Đăng nhập thất bại khi mật khẩu có dấu cách (sai)', async () => {
    /**
     * Test Case ID : UT_F02_11
     * Test Objective: Xác minh mật khẩu có dấu cách bị từ chối
     * Input         : password="wrong pass"
     * Expected Output: ValidationError "Mật khẩu không đúng" (compare trả false)
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(false);

    await expect(
      uc.execute({ email: 'a@b.com', password: 'wrong pass' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_12
  // -------------------------------------------------------------------
  it('UT_F02_12 – Đăng nhập thất bại khi email rỗng', async () => {
    /**
     * Test Case ID : UT_F02_12
     * Test Objective: Xác minh ValidationError khi email rỗng
     * Input         : email="", password="123456"
     * Expected Output: ValidationError "Thiếu thông tin"
     */
    await expect(
      uc.execute({ email: '', password: '123456' })
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_13
  // -------------------------------------------------------------------
  it('UT_F02_13 – findOne() được gọi đúng 1 lần với email được nhập', async () => {
    /**
     * Test Case ID : UT_F02_13
     * Test Objective: Xác minh tra cứu user bằng email chính xác
     * Input         : email="a@b.com"
     * Expected Output: findOne() được gọi đúng 1 lần
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_14
  // -------------------------------------------------------------------
  it('UT_F02_14 – passwordService.compare() được gọi với đúng plaintext và hash', async () => {
    /**
     * Test Case ID : UT_F02_14
     * Test Objective: Xác minh so sánh mật khẩu sử dụng đúng cặp (plain, hash)
     * Input         : password="123456", user.password_hash="hash"
     * Expected Output: compare() được gọi với ("123456", "hash")
     * Notes         : Bảo mật – phải so sánh đúng cặp
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(pwd.compare).toHaveBeenCalledWith('123456', 'hash');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_15
  // -------------------------------------------------------------------
  it('UT_F02_15 – Token trả về là chuỗi không rỗng', async () => {
    /**
     * Test Case ID : UT_F02_15
     * Test Objective: Xác minh token JWT được tạo ra và là chuỗi hợp lệ
     * Input         : Đăng nhập hợp lệ
     * Expected Output: result.token là string có độ dài > 0
     * Notes         : Bảo mật – token phải tồn tại để client sử dụng các API khác
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_16
  // -------------------------------------------------------------------
  it('UT_F02_16 – Kết quả đăng nhập thành công trả về user object đầy đủ', async () => {
    /**
     * Test Case ID : UT_F02_16
     * Test Objective: Xác minh response có user object đầy đủ (id, email)
     * Input         : Đăng nhập hợp lệ
     * Expected Output: result.user có id=1, email="a@b.com"
     * Notes         : Đảm bảo client nhận đủ thông tin hiển thị sau khi đăng nhập
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'a@b.com', password: '123456' });

    expect(result.user).toHaveProperty('id', 1);
    expect(result.user).toHaveProperty('email', 'a@b.com');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_17
  // -------------------------------------------------------------------
  it('UT_F02_17 – passwordService.compare() KHÔNG được gọi khi tài khoản bị khóa', async () => {
    /**
     * Test Case ID : UT_F02_17
     * Test Objective: Xác minh không tốn chi phí hash compare khi tài khoản bị khóa
     * Input         : user.is_active=false
     * Expected Output: ForbiddenError; compare() KHÔNG được gọi
     * Notes         : Tối ưu bảo mật – không so sánh mật khẩu khi tài khoản không hợp lệ
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'locked@b.com',
      password_hash: 'hash',
      is_active: false,
    });

    await expect(
      uc.execute({ email: 'locked@b.com', password: 'any' })
    ).rejects.toThrow(ForbiddenError);

    expect(pwd.compare).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_18
  // -------------------------------------------------------------------
  it('UT_F02_18 – findOne() KHÔNG được gọi khi email sai định dạng', async () => {
    /**
     * Test Case ID : UT_F02_18
     * Test Objective: Xác minh không query DB khi email đã sai định dạng
     * Input         : email="invalid"
     * Expected Output: ValidationError; findOne() KHÔNG được gọi
     * Notes         : Tối ưu hiệu năng – fail fast
     */
    await expect(
      uc.execute({ email: 'invalid', password: '123456' })
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_19
  // -------------------------------------------------------------------
  it('UT_F02_19 – Đăng nhập thành công với mật khẩu = 6 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F02_19
     * Test Objective: Xác minh mật khẩu đúng 6 ký tự (biên dưới) đăng nhập thành công
     * Input         : password="123456" (đúng 6 ký tự)
     * Expected Output: Đăng nhập thành công
     * Notes         : Giá trị biên của validation password
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'test@b.com',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'test@b.com', password: '123456' });

    expect(result.token).toBe('jwt-token');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F02_20
  // -------------------------------------------------------------------
  it('UT_F02_20 – Đăng nhập thành công với email có subdomain phức tạp', async () => {
    /**
     * Test Case ID : UT_F02_20
     * Test Objective: Xác minh email có nhiều subdomain vẫn hợp lệ
     * Input         : email="student@uni.edu.vn"
     * Expected Output: Đăng nhập thành công
     * Notes         : Email phức tạp có nhiều dấu chấm vẫn hợp lệ
     */
    repo.findOne.mockResolvedValue({
      id: 1,
      email: 'student@uni.edu.vn',
      password_hash: 'hash',
      is_active: true,
    });
    pwd.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'student@uni.edu.vn', password: '123456' });

    expect(result.user.email).toBe('student@uni.edu.vn');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'student@uni.edu.vn' } });
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F02_21 – LoginUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(LoginUseCase); });
  it('UT_F02_22 – LoginUseCase có prototype hợp lệ', () => { expect(LoginUseCase.prototype).toBeDefined(); });
  it('UT_F02_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F02_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F02_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
});
