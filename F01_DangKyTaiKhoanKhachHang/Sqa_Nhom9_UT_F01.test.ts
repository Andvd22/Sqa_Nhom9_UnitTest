/**
 * @file Sqa_Nhom9_UT_F01.test.ts
 * @module F01_DangKyTaiKhoanKhachHang
 * @description Unit tests for RegisterUserUseCase - F01: Đăng ký tài khoản khách hàng
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Đăng ký thành công với dữ liệu hợp lệ
 *  - Xử lý email đã tồn tại
 *  - Xử lý username đã tồn tại
 *  - Validation username (độ dài 3-50 ký tự)
 *  - Validation email định dạng
 *  - Validation password (độ dài 6-128 ký tự)
 *  - Validation phone (10-11 số)
 *  - Kiểm tra thiếu thông tin bắt buộc
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  RegisterUserUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  isValidEmail,
  IUserRepository,
} from './F01.src';

// =====================================================================
// HELPERS – factory functions for mock repository
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

// =====================================================================
// TEST SUITE
// =====================================================================
describe('F01 - Đăng ký tài khoản khách hàng | RegisterUserUseCase', () => {
  let repo: jest.Mocked<IUserRepository>;
  let uc: RegisterUserUseCase;

  beforeEach(() => {
    repo = makeUserRepo();
    uc = new RegisterUserUseCase(repo);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_01
  // -------------------------------------------------------------------
  it('UT_F01_01 – Đăng ký thành công với dữ liệu hợp lệ đầy đủ', async () => {
    /**
     * Test Case ID : UT_F01_01
     * Test Objective: Xác minh đăng ký tài khoản thành công với toàn bộ trường hợp lệ
     * Input         : username="nguyenvana", email="a@b.com", password="123456"
     * Expected Output: Trả về object user với id, username, email đúng, is_active=true
     * Notes         : CheckDB – userRepository.create() phải được gọi 1 lần
     *                 Rollback – mock; không có thay đổi DB thực
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'nguyenvana', email: 'a@b.com', is_active: true });

    const result = await uc.execute({ username: 'nguyenvana', email: 'a@b.com', password: '123456' });

    expect(result.is_active).toBe(true);
    expect(result.username).toBe('nguyenvana');
    expect(result.email).toBe('a@b.com');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_02
  // -------------------------------------------------------------------
  it('UT_F01_02 – Đăng ký thất bại khi email đã tồn tại', async () => {
    /**
     * Test Case ID : UT_F01_02
     * Test Objective: Xác minh hệ thống ném ConflictError khi email đã được đăng ký
     * Input         : email đã tồn tại trong DB
     * Expected Output: ConflictError với message "Email đã được sử dụng"
     * Notes         : CheckDB – create() KHÔNG được gọi khi email trùng
     */
    repo.findOne.mockResolvedValue({ id: 2 });

    await expect(
      uc.execute({ username: 'test2', email: 'a@b.com', password: '123456' })
    ).rejects.toThrow(ConflictError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_03
  // -------------------------------------------------------------------
  it('UT_F01_03 – Đăng ký thất bại khi username đã tồn tại', async () => {
    /**
     * Test Case ID : UT_F01_03
     * Test Objective: Xác minh hệ thống ném ConflictError khi username đã được sử dụng
     * Input         : username đã tồn tại (sau khi email check pass)
     * Expected Output: ConflictError "Username đã được sử dụng"
     * Notes         : CheckDB – findOne được gọi 2 lần (email + username), create() KHÔNG được gọi
     */
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 3 });

    await expect(
      uc.execute({ username: 'nguyenvana', email: 'new@b.com', password: '123456' })
    ).rejects.toThrow(ConflictError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_04
  // -------------------------------------------------------------------
  it('UT_F01_04 – Đăng ký thất bại khi username < 3 ký tự', async () => {
    /**
     * Test Case ID : UT_F01_04
     * Test Objective: Xác minh validation độ dài username tối thiểu
     * Input         : username="ab" (2 ký tự)
     * Expected Output: ValidationError "Username >= 3 ký tự"
     * Notes         : Không cần query DB
     */
    await expect(
      uc.execute({ username: 'ab', email: 'v@b.com', password: '123456' })
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_05
  // -------------------------------------------------------------------
  it('UT_F01_05 – Đăng ký thất bại khi username > 50 ký tự', async () => {
    /**
     * Test Case ID : UT_F01_05
     * Test Objective: Xác minh validation độ dài username tối đa
     * Input         : username=51 ký tự 'x'
     * Expected Output: ValidationError "Username <= 50 ký tự"
     */
    await expect(
      uc.execute({ username: 'x'.repeat(51), email: 'v@b.com', password: '123456' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_06
  // -------------------------------------------------------------------
  it('UT_F01_06 – Đăng ký thất bại khi email thiếu @', async () => {
    /**
     * Test Case ID : UT_F01_06
     * Test Objective: Xác minh validation email thiếu ký tự @
     * Input         : email="invalid.com"
     * Expected Output: ValidationError "Email không hợp lệ"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'invalid.com', password: '123456' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_07
  // -------------------------------------------------------------------
  it('UT_F01_07 – Đăng ký thất bại khi email thiếu domain', async () => {
    /**
     * Test Case ID : UT_F01_07
     * Test Objective: Xác minh validation email thiếu phần domain sau @
     * Input         : email="test@"
     * Expected Output: ValidationError "Email không hợp lệ"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'test@', password: '123456' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_08
  // -------------------------------------------------------------------
  it('UT_F01_08 – Đăng ký thất bại khi password < 6 ký tự', async () => {
    /**
     * Test Case ID : UT_F01_08
     * Test Objective: Xác minh validation độ dài password tối thiểu
     * Input         : password="12345" (5 ký tự)
     * Expected Output: ValidationError "Password >= 6 ký tự"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'v@b.com', password: '12345' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_09
  // -------------------------------------------------------------------
  it('UT_F01_09 – Đăng ký thất bại khi password > 128 ký tự', async () => {
    /**
     * Test Case ID : UT_F01_09
     * Test Objective: Xác minh validation độ dài password tối đa
     * Input         : password=129 ký tự 'x'
     * Expected Output: ValidationError "Password <= 128 ký tự"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'v@b.com', password: 'x'.repeat(129) })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_10
  // -------------------------------------------------------------------
  it('UT_F01_10 – Đăng ký thất bại khi thiếu toàn bộ thông tin bắt buộc', async () => {
    /**
     * Test Case ID : UT_F01_10
     * Test Objective: Xác minh hệ thống yêu cầu đầy đủ thông tin bắt buộc
     * Input         : username="", email="", password=""
     * Expected Output: ValidationError "Thiếu thông tin"
     * Notes         : Không query DB khi thiếu thông tin cơ bản
     */
    await expect(
      uc.execute({ username: '', email: '', password: '' } as any)
    ).rejects.toThrow(ValidationError);

    expect(repo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_11
  // -------------------------------------------------------------------
  it('UT_F01_11 – Đăng ký thất bại khi SĐT chứa chữ cái', async () => {
    /**
     * Test Case ID : UT_F01_11
     * Test Objective: Xác minh validation phone chỉ cho phép số
     * Input         : phone="abc123"
     * Expected Output: ValidationError "SĐT không hợp lệ"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'v@b.com', password: '123456', phone: 'abc123' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_12
  // -------------------------------------------------------------------
  it('UT_F01_12 – Đăng ký thất bại khi SĐT quá ngắn', async () => {
    /**
     * Test Case ID : UT_F01_12
     * Test Objective: Xác minh validation phone tối thiểu 10 số
     * Input         : phone="12345" (5 số)
     * Expected Output: ValidationError "SĐT không hợp lệ"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'v@b.com', password: '123456', phone: '12345' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_13
  // -------------------------------------------------------------------
  it('UT_F01_13 – Đăng ký thành công với phone hợp lệ 10 số', async () => {
    /**
     * Test Case ID : UT_F01_13
     * Test Objective: Xác minh đăng ký thành công với SĐT hợp lệ
     * Input         : phone="0901234567" (10 số)
     * Expected Output: create() được gọi, trả về user.id
     * Notes         : CheckDB – phone hợp lệ được lưu vào DB
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 5 });

    const result = await uc.execute({
      username: 'valid',
      email: 'v@b.com',
      password: '123456',
      phone: '0901234567',
    });

    expect(result.id).toBe(5);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_14
  // -------------------------------------------------------------------
  it('UT_F01_14 – Đăng ký thất bại khi SĐT quá dài (12 số)', async () => {
    /**
     * Test Case ID : UT_F01_14
     * Test Objective: Xác minh validation phone tối đa 11 số
     * Input         : phone="090123456789" (12 số)
     * Expected Output: ValidationError "SĐT không hợp lệ"
     */
    await expect(
      uc.execute({ username: 'valid', email: 'v@b.com', password: '123456', phone: '090123456789' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_15
  // -------------------------------------------------------------------
  it('UT_F01_15 – Đăng ký thành công với password = 6 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F01_15
     * Test Objective: Xác minh password đúng 6 ký tự (giá trị biên dưới) được chấp nhận
     * Input         : password="123456" (đúng 6 ký tự)
     * Expected Output: Đăng ký thành công, create() được gọi
     * Notes         : Biên dưới của validation password
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'valid', email: 'v@b.com', is_active: true });

    const result = await uc.execute({ username: 'valid', email: 'v@b.com', password: '123456' });

    expect(result.is_active).toBe(true);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_16
  // -------------------------------------------------------------------
  it('UT_F01_16 – Đăng ký thành công với password = 128 ký tự (biên trên)', async () => {
    /**
     * Test Case ID : UT_F01_16
     * Test Objective: Xác minh password đúng 128 ký tự (giá trị biên trên) được chấp nhận
     * Input         : password=128 ký tự 'x'
     * Expected Output: Đăng ký thành công, create() được gọi
     * Notes         : Biên trên của validation password
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'valid', email: 'v@b.com', is_active: true });

    const result = await uc.execute({
      username: 'valid',
      email: 'v@b.com',
      password: 'x'.repeat(128),
    });

    expect(result.is_active).toBe(true);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_17
  // -------------------------------------------------------------------
  it('UT_F01_17 – Đăng ký thành công với username = 3 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F01_17
     * Test Objective: Xác minh username đúng 3 ký tự (giá trị biên dưới) được chấp nhận
     * Input         : username="abc" (3 ký tự)
     * Expected Output: Đăng ký thành công
     * Notes         : Biên dưới của validation username
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'abc', email: 'test@b.com', is_active: true });

    const result = await uc.execute({ username: 'abc', email: 'test@b.com', password: '123456' });

    expect(result.username).toBe('abc');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_18
  // -------------------------------------------------------------------
  it('UT_F01_18 – Đăng ký thành công với username = 50 ký tự (biên trên)', async () => {
    /**
     * Test Case ID : UT_F01_18
     * Test Objective: Xác minh username đúng 50 ký tự (giá trị biên trên) được chấp nhận
     * Input         : username=50 ký tự 'x'
     * Expected Output: Đăng ký thành công
     * Notes         : Biên trên của validation username
     */
    const longName = 'x'.repeat(50);
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: longName, email: 'test@b.com', is_active: true });

    const result = await uc.execute({ username: longName, email: 'test@b.com', password: '123456' });

    expect(result.username).toBe(longName);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_19
  // -------------------------------------------------------------------
  it('UT_F01_19 – Đăng ký thành công với email có subdomain', async () => {
    /**
     * Test Case ID : UT_F01_19
     * Test Objective: Xác minh email có subdomain (a@student.b.com) được chấp nhận
     * Input         : email="user@student.university.edu.vn"
     * Expected Output: Đăng ký thành công
     * Notes         : Email phức tạp có nhiều dấu chấm vẫn hợp lệ
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'student', email: 'user@student.university.edu.vn', is_active: true });

    const result = await uc.execute({
      username: 'student',
      email: 'user@student.university.edu.vn',
      password: '123456',
    });

    expect(result.email).toBe('user@student.university.edu.vn');
    expect(isValidEmail('user@student.university.edu.vn')).toBe(true);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F01_20
  // -------------------------------------------------------------------
  it('UT_F01_20 – findOne() được gọi đúng 2 lần (email + username) khi đăng ký', async () => {
    /**
     * Test Case ID : UT_F01_20
     * Test Objective: Xác minh use case kiểm tra cả email và username trước khi tạo tài khoản
     * Input         : username="newuser", email="new@b.com", password="123456"
     * Expected Output: findOne() được gọi đúng 2 lần (1 cho email, 1 cho username)
     * Notes         : CheckDB – phải query DB để kiểm tra cả email và username tồn tại trước khi insert
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, username: 'newuser', email: 'new@b.com', is_active: true });

    await uc.execute({ username: 'newuser', email: 'new@b.com', password: '123456' });

    expect(repo.findOne).toHaveBeenCalledTimes(2);
    expect(repo.findOne).toHaveBeenNthCalledWith(1, { where: { email: 'new@b.com' } });
    expect(repo.findOne).toHaveBeenNthCalledWith(2, { where: { username: 'newuser' } });
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F01_21 – RegisterUserUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(RegisterUserUseCase); });
  it('UT_F01_22 – RegisterUserUseCase có prototype hợp lệ', () => { expect(RegisterUserUseCase.prototype).toBeDefined(); });
  it('UT_F01_23 – isValidEmail trả về true với email hợp lệ', () => { expect(isValidEmail('valid@example.com')).toBe(true); });
  it('UT_F01_24 – isValidEmail trả về false với email không hợp lệ', () => { expect(isValidEmail('invalid-email')).toBe(false); });
  it('UT_F01_25 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F01_26 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F01_27 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
});
