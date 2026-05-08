/**
 * @file Sqa_Nhom9_UT_F07.test.ts
 * @module F07_DoiMatKhau
 * @description Unit tests for ChangePasswordUseCase - F07: Đổi mật khẩu
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Đổi mật khẩu thành công
 *  - Sai mật khẩu cũ
 *  - Mật khẩu mới < 6 ký tự
 *  - User không tồn tại
 *  - Mật khẩu mới > 128 ký tự
 *  - Xác nhận mật khẩu không khớp
 *  - Mật khẩu mới trùng cũ
 *  - Đổi với confirmPass đúng
 *  - Old pass rỗng
 *  - New pass rỗng
 *  - User bị khóa vẫn đổi được
 *  - Hash được gọi đúng
 *  - update() được gọi đúng 1 lần
 *  - findByPk() được gọi đúng 1 lần
 *  - Biên dưới 6 ký tự
 *  - Biên trên 128 ký tự
 *  - Không truyền confirmPass
 *  - password_hash là null
 *  - compare() đúng tham số
 *  - Đổi pass liên tiếp 2 lần
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  ChangePasswordUseCase,
  ValidationError,
  NotFoundError,
  IUserRepository,
  IPasswordService,
} from './F07.src';

// =====================================================================
// HELPERS – factory functions for mock repository & password service
// =====================================================================
function makeUserRepo(): jest.Mocked<IUserRepository> {
  return {
    findByPk: jest.fn(),
    update: jest.fn(),
  } as any;
}

function makePwdSvc(): jest.Mocked<IPasswordService> {
  return {
    compare: jest.fn(),
    hash: jest.fn(),
  } as any;
}

// =====================================================================
// TEST SUITE
// =====================================================================
describe('F07 – Đổi mật khẩu | ChangePasswordUseCase', () => {
  let repo: jest.Mocked<IUserRepository>;
  let pwd: jest.Mocked<IPasswordService>;
  let uc: ChangePasswordUseCase;

  beforeEach(() => {
    repo = makeUserRepo();
    pwd = makePwdSvc();
    uc = new ChangePasswordUseCase(repo, pwd);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_01
  // -------------------------------------------------------------------
  it('UT_F07_01 – Đổi mật khẩu thành công', async () => {
    /**
     * Test Case ID : UT_F07_01
     * Test Objective: Xác minh đổi mật khẩu cơ bản thành công
     * Input         : userId=1, oldPass='old123', newPass='new123'
     * Expected Output: { message: 'Đổi mật khẩu thành công' }
     * Notes         : CheckDB – update() được gọi với password_hash mới
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(result.message).toBe('Đổi mật khẩu thành công');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: 'newhash' }),
      { where: { id: 1 } }
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_02
  // -------------------------------------------------------------------
  it('UT_F07_02 – Sai mật khẩu cũ', async () => {
    /**
     * Test Case ID : UT_F07_02
     * Test Objective: Xác minh ValidationError khi mật khẩu cũ không đúng
     * Input         : oldPass='wrong'
     * Expected Output: ValidationError "Mật khẩu cũ không đúng"
     * Notes         : Không gọi hash() hay update()
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(false);

    await expect(
      uc.execute({ userId: 1, oldPass: 'wrong', newPass: 'new123' })
    ).rejects.toThrow(ValidationError);

    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_03
  // -------------------------------------------------------------------
  it('UT_F07_03 – Mật khẩu mới < 6 ký tự', async () => {
    /**
     * Test Case ID : UT_F07_03
     * Test Objective: Xác minh ValidationError khi mật khẩu mới quá ngắn
     * Input         : newPass='12345'
     * Expected Output: ValidationError "Mật khẩu mới >= 6 ký tự"
     * Notes         : Không hash/update
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);

    await expect(
      uc.execute({ userId: 1, oldPass: 'old123', newPass: '12345' })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_04
  // -------------------------------------------------------------------
  it('UT_F07_04 – User không tồn tại', async () => {
    /**
     * Test Case ID : UT_F07_04
     * Test Objective: Xác minh NotFoundError khi userId không có trong DB
     * Input         : userId=999
     * Expected Output: NotFoundError "Người dùng không tồn tại"
     * Notes         : Không gọi compare/hash/update
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 999, oldPass: 'old123', newPass: 'new123' })
    ).rejects.toThrow(NotFoundError);

    expect(pwd.compare).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_05
  // -------------------------------------------------------------------
  it('UT_F07_05 – Mật khẩu mới > 128 ký tự', async () => {
    /**
     * Test Case ID : UT_F07_05
     * Test Objective: Xác minh ValidationError khi mật khẩu mới quá dài
     * Input         : newPass='x'.repeat(129)
     * Expected Output: ValidationError "Mật khẩu mới <= 128 ký tự"
     * Notes         : Không hash/update
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);

    await expect(
      uc.execute({ userId: 1, oldPass: 'old123', newPass: 'x'.repeat(129) })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_06
  // -------------------------------------------------------------------
  it('UT_F07_06 – Xác nhận mật khẩu không khớp', async () => {
    /**
     * Test Case ID : UT_F07_06
     * Test Objective: Xác minh ValidationError khi confirmPass khác newPass
     * Input         : newPass='new123', confirmPass='different'
     * Expected Output: ValidationError "Xác nhận mật khẩu không khớp"
     * Notes         : Không hash/update
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);

    await expect(
      uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123', confirmPass: 'different' })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_07
  // -------------------------------------------------------------------
  it('UT_F07_07 – Mật khẩu mới trùng mật khẩu cũ', async () => {
    /**
     * Test Case ID : UT_F07_07
     * Test Objective: Xác minh ValidationError khi newPass === oldPass
     * Input         : oldPass='same123', newPass='same123'
     * Expected Output: ValidationError "Mật khẩu mới phải khác mật khẩu cũ"
     * Notes         : Không hash/update
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);

    await expect(
      uc.execute({ userId: 1, oldPass: 'same123', newPass: 'same123' })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_08
  // -------------------------------------------------------------------
  it('UT_F07_08 – Đổi với confirmPass đúng', async () => {
    /**
     * Test Case ID : UT_F07_08
     * Test Objective: Xác minh đổi thành công khi có confirmPass khớp
     * Input         : newPass='new123', confirmPass='new123'
     * Expected Output: { message: 'Đổi mật khẩu thành công' }
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({
      userId: 1,
      oldPass: 'old123',
      newPass: 'new123',
      confirmPass: 'new123',
    });

    expect(result.message).toBe('Đổi mật khẩu thành công');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_09
  // -------------------------------------------------------------------
  it('UT_F07_09 – Old pass rỗng', async () => {
    /**
     * Test Case ID : UT_F07_09
     * Test Objective: Xác minh ValidationError khi oldPass rỗng (compare trả false)
     * Input         : oldPass=''
     * Expected Output: ValidationError "Mật khẩu cũ không đúng"
     * Notes         : compare('','oldhash') trả về false
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(false);

    await expect(
      uc.execute({ userId: 1, oldPass: '', newPass: 'new123' })
    ).rejects.toThrow(ValidationError);

    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_10
  // -------------------------------------------------------------------
  it('UT_F07_10 – New pass rỗng', async () => {
    /**
     * Test Case ID : UT_F07_10
     * Test Objective: Xác minh ValidationError khi newPass rỗng (length=0 < 6)
     * Input         : newPass=''
     * Expected Output: ValidationError "Mật khẩu mới >= 6 ký tự"
     * Notes         : Qua compare rồi mới validate length
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);

    await expect(
      uc.execute({ userId: 1, oldPass: 'old123', newPass: '' })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_11
  // -------------------------------------------------------------------
  it('UT_F07_11 – User bị khóa vẫn đổi được', async () => {
    /**
     * Test Case ID : UT_F07_11
     * Test Objective: Xác minh tài khoản bị khóa vẫn có thể đổi pass
     * Input         : is_active=false
     * Expected Output: Cập nhật thành công
     * Notes         : Use case không kiểm tra is_active
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash', is_active: false });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(result.message).toBe('Đổi mật khẩu thành công');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_12
  // -------------------------------------------------------------------
  it('UT_F07_12 – Hash được gọi với đúng newPass', async () => {
    /**
     * Test Case ID : UT_F07_12
     * Test Objective: Xác minh password service hash đúng chuỗi mật khẩu mới
     * Input         : newPass='new123'
     * Expected Output: hash('new123') được gọi
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(pwd.hash).toHaveBeenCalledWith('new123');
    expect(pwd.hash).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_13
  // -------------------------------------------------------------------
  it('UT_F07_13 – update() được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F07_13
     * Test Objective: Xác minh không có vòng lặp/retry update DB
     * Input         : userId=1, newPass='new123'
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần sẽ gây lỗi dữ liệu
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_14
  // -------------------------------------------------------------------
  it('UT_F07_14 – findByPk() được gọi đúng 1 lần với userId', async () => {
    /**
     * Test Case ID : UT_F07_14
     * Test Objective: Xác minh tra cứu user trước khi đổi pass
     * Input         : userId=1
     * Expected Output: findByPk(1) được gọi đúng 1 lần
     * Notes         : CheckDB – tránh N+1 query
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(repo.findByPk).toHaveBeenCalledTimes(1);
    expect(repo.findByPk).toHaveBeenCalledWith(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_15
  // -------------------------------------------------------------------
  it('UT_F07_15 – Mật khẩu mới đúng 6 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F07_15
     * Test Objective: Xác minh mật khẩu mới đúng 6 ký tự được chấp nhận
     * Input         : newPass='123456'
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'old123', newPass: '123456' });

    expect(result.message).toBe('Đổi mật khẩu thành công');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_16
  // -------------------------------------------------------------------
  it('UT_F07_16 – Mật khẩu mới đúng 128 ký tự (biên trên)', async () => {
    /**
     * Test Case ID : UT_F07_16
     * Test Objective: Xác minh mật khẩu mới đúng 128 ký tự được chấp nhận
     * Input         : newPass='x'.repeat(128)
     * Expected Output: Cập nhật thành công
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const longPass = 'x'.repeat(128);
    const result = await uc.execute({ userId: 1, oldPass: 'old123', newPass: longPass });

    expect(result.message).toBe('Đổi mật khẩu thành công');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_17
  // -------------------------------------------------------------------
  it('UT_F07_17 – Không truyền confirmPass (undefined) vẫn OK', async () => {
    /**
     * Test Case ID : UT_F07_17
     * Test Objective: Xác minh confirmPass là optional
     * Input         : không có confirmPass trong input
     * Expected Output: Cập nhật thành công
     * Notes         : confirmPass===undefined nên bỏ qua check khớp
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(result.message).toBe('Đổi mật khẩu thành công');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_18
  // -------------------------------------------------------------------
  it('UT_F07_18 – User có password_hash là null (compare trả false)', async () => {
    /**
     * Test Case ID : UT_F07_18
     * Test Objective: Xác minh ValidationError khi password_hash null
     * Input         : user.password_hash=null
     * Expected Output: ValidationError "Mật khẩu cũ không đúng"
     * Notes         : compare() với null trả về false
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: null });
    pwd.compare.mockResolvedValue(false);

    await expect(
      uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' })
    ).rejects.toThrow(ValidationError);

    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_19
  // -------------------------------------------------------------------
  it('UT_F07_19 – compare() được gọi với đúng oldPass và password_hash', async () => {
    /**
     * Test Case ID : UT_F07_19
     * Test Objective: Xác minh password service compare nhận đúng tham số
     * Input         : oldPass='old123', password_hash='oldhash'
     * Expected Output: compare('old123','oldhash') được gọi
     */
    repo.findByPk.mockResolvedValue({ id: 1, password_hash: 'oldhash' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'new123' });

    expect(pwd.compare).toHaveBeenCalledWith('old123', 'oldhash');
    expect(pwd.compare).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F07_20
  // -------------------------------------------------------------------
  it('UT_F07_20 – Đổi pass liên tiếp 2 lần với mật khẩu khác nhau', async () => {
    /**
     * Test Case ID : UT_F07_20
     * Test Objective: Xác minh đổi pass nhiều lần liên tiếp thành công
     * Input         : Lần 1 newPass='passAA', lần 2 newPass='passBB'
     * Expected Output: Cả 2 lần đều thành công
     * Notes         : CheckDB – mỗi lần update() được gọi 1 lần
     */
    repo.findByPk
      .mockResolvedValueOnce({ id: 1, password_hash: 'hash1' })
      .mockResolvedValueOnce({ id: 1, password_hash: 'hashA' });
    pwd.compare.mockResolvedValue(true);
    pwd.hash
      .mockResolvedValueOnce('hashA')
      .mockResolvedValueOnce('hashB');
    repo.update.mockResolvedValue([1]);

    const r1 = await uc.execute({ userId: 1, oldPass: 'old123', newPass: 'passAA' });
    const r2 = await uc.execute({ userId: 1, oldPass: 'passAA', newPass: 'passBB' });

    expect(r1.message).toBe('Đổi mật khẩu thành công');
    expect(r2.message).toBe('Đổi mật khẩu thành công');
    expect(pwd.hash).toHaveBeenCalledTimes(2);
    expect(repo.update).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F07_21 – ChangePasswordUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(ChangePasswordUseCase); });
  it('UT_F07_22 – ChangePasswordUseCase có prototype hợp lệ', () => { expect(ChangePasswordUseCase.prototype).toBeDefined(); });
  it('UT_F07_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F07_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F07_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F07_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
});
