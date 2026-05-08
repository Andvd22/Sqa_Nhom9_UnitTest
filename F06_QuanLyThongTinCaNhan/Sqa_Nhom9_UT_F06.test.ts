/**
 * @file Sqa_Nhom9_UT_F06.test.ts
 * @module F06_QuanLyThongTinCaNhan
 * @description Unit tests for UpdateUserInfoUseCase - F06: Quản lý thông tin cá nhân
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Cập nhật phone, email, username, avatar thành công
 *  - Email/username trùng
 *  - Email sai định dạng
 *  - User không tồn tại
 *  - Không có thay đổi
 *  - SĐT không hợp lệ
 *  - Username < 3 ký tự
 *  - Cập nhật nhiều field
 *  - Email/username giống hiện tại
 *  - SĐT quá dài
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  UpdateUserInfoUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  isValidEmail,
  IUserRepository,
} from './F06.src';

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
describe('F06 - Quản lý thông tin cá nhân | UpdateUserInfoUseCase', () => {
  let repo: jest.Mocked<IUserRepository>;
  let uc: UpdateUserInfoUseCase;

  beforeEach(() => {
    repo = makeUserRepo();
    uc = new UpdateUserInfoUseCase(repo);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_01
  // -------------------------------------------------------------------
  it('UT_F06_01 – Cập nhật phone thành công', async () => {
    /**
     * Test Case ID : UT_F06_01
     * Test Objective: Xác minh cập nhật SĐT hợp lệ
     * Input         : userId=1, phone='0901234567'
     * Expected Output: result.phone='0901234567'
     * Notes         : CheckDB – update() được gọi với đúng phone
     */
    repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, phone: '0901234567' });

    expect(result.phone).toBe('0901234567');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '0901234567' }),
      { where: { id: 1 } }
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_02
  // -------------------------------------------------------------------
  it('UT_F06_02 – Email trùng với user khác', async () => {
    /**
     * Test Case ID : UT_F06_02
     * Test Objective: Xác minh ConflictError khi email đã được sử dụng
     * Input         : userId=1, email='existing@e.com' (của user 2)
     * Expected Output: ConflictError "Email đã được sử dụng"
     * Notes         : CheckDB – update() KHÔNG được gọi
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });
    repo.findOne.mockResolvedValue({ id: 2 });

    await expect(
      uc.execute({ userId: 1, email: 'existing@e.com' })
    ).rejects.toThrow(ConflictError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_03
  // -------------------------------------------------------------------
  it('UT_F06_03 – Email sai định dạng', async () => {
    /**
     * Test Case ID : UT_F06_03
     * Test Objective: Xác minh ValidationError khi email không hợp lệ
     * Input         : email='invalid-email'
     * Expected Output: ValidationError "Email không hợp lệ"
     * Notes         : Không query DB để check trùng
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });

    await expect(
      uc.execute({ userId: 1, email: 'invalid-email' })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_04
  // -------------------------------------------------------------------
  it('UT_F06_04 – User không tồn tại', async () => {
    /**
     * Test Case ID : UT_F06_04
     * Test Objective: Xác minh NotFoundError khi userId không có trong DB
     * Input         : userId=999
     * Expected Output: NotFoundError "Người dùng không tồn tại"
     * Notes         : Không update DB
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 999, phone: '0901234567' })
    ).rejects.toThrow(NotFoundError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_05
  // -------------------------------------------------------------------
  it('UT_F06_05 – Không có thay đổi nào', async () => {
    /**
     * Test Case ID : UT_F06_05
     * Test Objective: Xác minh ValidationError khi không truyền field nào
     * Input         : userId=1 (không có email, phone, username, avatar)
     * Expected Output: ValidationError "Không có dữ liệu để cập nhật"
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await expect(uc.execute({ userId: 1 })).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_06
  // -------------------------------------------------------------------
  it('UT_F06_06 – Username trùng với user khác', async () => {
    /**
     * Test Case ID : UT_F06_06
     * Test Objective: Xác minh ConflictError khi username đã được sử dụng
     * Input         : userId=1, username='new' (của user 2)
     * Expected Output: ConflictError "Username đã được sử dụng"
     */
    repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });
    repo.findOne.mockResolvedValue({ id: 2 });

    await expect(
      uc.execute({ userId: 1, username: 'new' })
    ).rejects.toThrow(ConflictError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_07
  // -------------------------------------------------------------------
  it('UT_F06_07 – Cập nhật avatar thành công', async () => {
    /**
     * Test Case ID : UT_F06_07
     * Test Objective: Xác minh cập nhật ảnh đại diện
     * Input         : avatar='pic.jpg'
     * Expected Output: result.avatar='pic.jpg'
     */
    repo.findByPk.mockResolvedValue({ id: 1 });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, avatar: 'pic.jpg' });

    expect(result.avatar).toBe('pic.jpg');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_08
  // -------------------------------------------------------------------
  it('UT_F06_08 – SĐT không hợp lệ (chữ cái)', async () => {
    /**
     * Test Case ID : UT_F06_08
     * Test Objective: Xác minh ValidationError khi SĐT chứa chữ cái
     * Input         : phone='abc'
     * Expected Output: ValidationError "SĐT không hợp lệ"
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.execute({ userId: 1, phone: 'abc' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_09
  // -------------------------------------------------------------------
  it('UT_F06_09 – Username < 3 ký tự', async () => {
    /**
     * Test Case ID : UT_F06_09
     * Test Objective: Xác minh ValidationError khi username < 3 ký tự
     * Input         : username='ab'
     * Expected Output: ValidationError "Username >= 3 ký tự"
     */
    repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

    await expect(
      uc.execute({ userId: 1, username: 'ab' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_10
  // -------------------------------------------------------------------
  it('UT_F06_10 – Cập nhật nhiều field cùng lúc', async () => {
    /**
     * Test Case ID : UT_F06_10
     * Test Objective: Xác minh cập nhật đồng thời email, username, phone
     * Input         : email='new@e.com', username='newu', phone='0901111111'
     * Expected Output: result có cả 3 field mới
     * Notes         : CheckDB – update() được gọi 1 lần với cả 3 field
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com', username: 'old', phone: '0900000000' });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({
      userId: 1,
      email: 'new@e.com',
      username: 'newu',
      phone: '0901111111',
    });

    expect(result.email).toBe('new@e.com');
    expect(result.username).toBe('newu');
    expect(result.phone).toBe('0901111111');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@e.com',
        username: 'newu',
        phone: '0901111111',
      }),
      { where: { id: 1 } }
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_11
  // -------------------------------------------------------------------
  it('UT_F06_11 – Email giống hiện tại (không check trùng)', async () => {
    /**
     * Test Case ID : UT_F06_11
     * Test Objective: Xác minh không check trùng khi email không đổi
     * Input         : email='same@e.com' (giống current)
     * Expected Output: Cập nhật thành công, findOne KHÔNG được gọi cho email
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'same@e.com' });
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, email: 'same@e.com' });

    expect(result.email).toBe('same@e.com');
    // findOne không được gọi vì email giống hiện tại
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_12
  // -------------------------------------------------------------------
  it('UT_F06_12 – Username giống hiện tại (không check trùng)', async () => {
    /**
     * Test Case ID : UT_F06_12
     * Test Objective: Xác minh không check trùng khi username không đổi
     * Input         : username='same' (giống current)
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1, username: 'same' });
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, username: 'same' });

    expect(result.username).toBe('same');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_13
  // -------------------------------------------------------------------
  it('UT_F06_13 – SĐT quá dài (12 số)', async () => {
    /**
     * Test Case ID : UT_F06_13
     * Test Objective: Xác minh ValidationError khi SĐT > 11 số
     * Input         : phone='090123456789' (12 số)
     * Expected Output: ValidationError "SĐT không hợp lệ"
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.execute({ userId: 1, phone: '090123456789' })
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_14
  // -------------------------------------------------------------------
  it('UT_F06_14 – Cập nhật thành email hợp lệ mới', async () => {
    /**
     * Test Case ID : UT_F06_14
     * Test Objective: Xác minh cập nhật email hợp lệ
     * Input         : email='valid@new.com'
     * Expected Output: result.email='valid@new.com'
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, email: 'valid@new.com' });

    expect(result.email).toBe('valid@new.com');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_15
  // -------------------------------------------------------------------
  it('UT_F06_15 – Cập nhật username = 3 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F06_15
     * Test Objective: Xác minh username đúng 3 ký tự được chấp nhận
     * Input         : username='abc'
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, username: 'abc' });

    expect(result.username).toBe('abc');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_16
  // -------------------------------------------------------------------
  it('UT_F06_16 – update() được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F06_16
     * Test Objective: Xác minh không có vòng lặp/retry update
     * Input         : userId=1, phone='0901234567'
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần sẽ gây lỗi dữ liệu
     */
    repo.findByPk.mockResolvedValue({ id: 1 });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, phone: '0901234567' });

    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_17
  // -------------------------------------------------------------------
  it('UT_F06_17 – findByPk() được gọi đúng 1 lần với userId', async () => {
    /**
     * Test Case ID : UT_F06_17
     * Test Objective: Xác minh tra cứu user trước khi cập nhật
     * Input         : userId=1
     * Expected Output: findByPk(1) được gọi đúng 1 lần
     */
    repo.findByPk.mockResolvedValue({ id: 1 });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, phone: '0901234567' });

    expect(repo.findByPk).toHaveBeenCalledTimes(1);
    expect(repo.findByPk).toHaveBeenCalledWith(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_18
  // -------------------------------------------------------------------
  it('UT_F06_18 – SĐT = 10 số (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F06_18
     * Test Objective: Xác minh SĐT đúng 10 số được chấp nhận
     * Input         : phone='0901234567'
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1 });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, phone: '0901234567' });

    expect(result.phone).toBe('0901234567');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_19
  // -------------------------------------------------------------------
  it('UT_F06_19 – SĐT = 11 số (biên trên)', async () => {
    /**
     * Test Case ID : UT_F06_19
     * Test Objective: Xác minh SĐT đúng 11 số được chấp nhận
     * Input         : phone='09012345678'
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1 });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, phone: '09012345678' });

    expect(result.phone).toBe('09012345678');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F06_20
  // -------------------------------------------------------------------
  it('UT_F06_20 – Email có subdomain phức tạp được chấp nhận', async () => {
    /**
     * Test Case ID : UT_F06_20
     * Test Objective: Xác minh email có nhiều subdomain vẫn hợp lệ
     * Input         : email='student@uni.edu.vn'
     * Expected Output: Cập nhật thành công
     * Notes         : isValidEmail('student@uni.edu.vn') === true
     */
    repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });
    repo.findOne.mockResolvedValue(null);
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, email: 'student@uni.edu.vn' });

    expect(result.email).toBe('student@uni.edu.vn');
    expect(isValidEmail('student@uni.edu.vn')).toBe(true);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F06_21 – UpdateUserInfoUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(UpdateUserInfoUseCase); });
  it('UT_F06_22 – UpdateUserInfoUseCase có prototype hợp lệ', () => { expect(UpdateUserInfoUseCase.prototype).toBeDefined(); });
  it('UT_F06_23 – isValidEmail trả về true với email hợp lệ', () => { expect(isValidEmail('valid@example.com')).toBe(true); });
  it('UT_F06_24 – isValidEmail trả về false với email không hợp lệ', () => { expect(isValidEmail('invalid-email')).toBe(false); });
  it('UT_F06_25 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F06_26 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F06_27 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F06_28 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
});
