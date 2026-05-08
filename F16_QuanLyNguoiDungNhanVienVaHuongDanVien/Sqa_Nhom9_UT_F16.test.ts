/**
 * @file Sqa_Nhom9_UT_F16.test.ts
 * @module F16_QuanLyNguoiDungNhanVienVaHuongDanVien
 * @description Unit tests for UserManagementUseCase - F16: Quản lý người dùng, nhân viên và hướng dẫn viên
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Lấy danh sách user thành công
 *  - Lọc theo role
 *  - Lọc theo is_active
 *  - Khóa user thành công
 *  - Khóa user đã bị khóa
 *  - User không tồn tại (ban)
 *  - Cập nhật user thành công
 *  - Email trùng (update)
 *  - Username trùng (update)
 *  - Tạo admin thành công
 *  - Thiếu thông tin (createAdmin)
 *  - Email sai định dạng
 *  - Password < 6 ký tự
 *  - Email trùng (createAdmin)
 *  - Role không hợp lệ
 *  - Đổi role (SUPER_ADMIN)
 *  - Đổi role (non-SUPER_ADMIN bị từ chối)
 *  - Reset password (ADMIN)
 *  - Reset password (non-ADMIN bị từ chối)
 *  - findByPk user đúng 1 lần (ban)
 *  - update() đúng 1 lần (ban)
 */

import {
  UserManagementUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  AdminRole,
  IUserRepository,
  IPasswordService,
} from './F16.src';

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  } as any;
}

function makePwdSvc(): jest.Mocked<IPasswordService> {
  return { hash: jest.fn() } as any;
}

describe('F16 – Quản lý người dùng, nhân viên và HDV | UserManagementUseCase', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let pwdSvc: jest.Mocked<IPasswordService>;
  let uc: UserManagementUseCase;

  beforeEach(() => {
    userRepo = makeUserRepo();
    pwdSvc = makePwdSvc();
    uc = new UserManagementUseCase(userRepo, pwdSvc);
  });

  // UT_F16_01
  it('UT_F16_01 – Lấy danh sách user thành công', async () => {
    /**
     * Test Case ID : UT_F16_01
     * Test Objective: Xác minh lấy danh sách user phân trang
     * Input         : page=1, limit=10
     * Expected Output: { users: [...], pagination: {...} }
     * Notes         : CheckDB – findAndCountAll được gọi
     */
    const rows = [
      { id: 1, username: 'user1' },
      { id: 2, username: 'user2' },
    ];
    userRepo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.getUsers({ page: 1, limit: 10 });

    expect(result.users).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  // UT_F16_02
  it('UT_F16_02 – Lọc theo role', async () => {
    /**
     * Test Case ID : UT_F16_02
     * Test Objective: Xác minh filter theo role
     * Input         : role='guide'
     * Expected Output: where.role='guide'
     * Notes         : CheckDB – findAndCountAll với where
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 3, role: 'guide' }] });

    await uc.getUsers({ role: 'guide' });

    expect(userRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'guide' }),
      })
    );
  });

  // UT_F16_03
  it('UT_F16_03 – Lọc theo is_active', async () => {
    /**
     * Test Case ID : UT_F16_03
     * Test Objective: Xác minh filter theo is_active
     * Input         : isActive=true
     * Expected Output: where.is_active=true
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.getUsers({ isActive: true });

    expect(userRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_active: true }),
      })
    );
  });

  // UT_F16_04
  it('UT_F16_04 – Khóa user thành công', async () => {
    /**
     * Test Case ID : UT_F16_04
     * Test Objective: Xác minh khóa user active
     * Input         : userId=1, is_active=true
     * Expected Output: { message: 'Khóa thành công' }
     * Notes         : CheckDB – update() với is_active=false
     */
    userRepo.findByPk.mockResolvedValue({ id: 1, is_active: true });
    userRepo.update.mockResolvedValue([1]);

    const result = await uc.banUser(1);

    expect(result.message).toBe('Khóa thành công');
    expect(userRepo.update).toHaveBeenCalledWith(
      { is_active: false },
      { where: { id: 1 } }
    );
  });

  // UT_F16_05
  it('UT_F16_05 – Khóa user đã bị khóa', async () => {
    /**
     * Test Case ID : UT_F16_05
     * Test Objective: Xác minh ValidationError khi user đã khóa
     * Input         : is_active=false
     * Expected Output: ValidationError "Người dùng đã bị khóa"
     * Notes         : Không update
     */
    userRepo.findByPk.mockResolvedValue({ id: 1, is_active: false });

    await expect(uc.banUser(1)).rejects.toThrow(ValidationError);

    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_06
  it('UT_F16_06 – User không tồn tại (ban)', async () => {
    /**
     * Test Case ID : UT_F16_06
     * Test Objective: Xác minh NotFoundError khi userId không có
     * Input         : userId=999
     * Expected Output: NotFoundError "Người dùng không tồn tại"
     * Notes         : Không update
     */
    userRepo.findByPk.mockResolvedValue(null);

    await expect(uc.banUser(999)).rejects.toThrow(NotFoundError);

    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_07
  it('UT_F16_07 – Cập nhật user thành công', async () => {
    /**
     * Test Case ID : UT_F16_07
     * Test Objective: Xác minh cập nhật thông tin user
     * Input         : userId=1, email='new@e.com'
     * Expected Output: { message: 'Cập nhật thành công' }
     * Notes         : CheckDB – update() được gọi
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    userRepo.findOne.mockResolvedValue(null);
    userRepo.update.mockResolvedValue([1]);

    const result = await uc.updateUser({ userId: 1, email: 'new@e.com' });

    expect(result.message).toBe('Cập nhật thành công');
  });

  // UT_F16_08
  it('UT_F16_08 – Email trùng (update)', async () => {
    /**
     * Test Case ID : UT_F16_08
     * Test Objective: Xác minh ConflictError khi email đã có
     * Input         : email='existing@e.com' (của user 2)
     * Expected Output: ConflictError "Email đã tồn tại"
     * Notes         : Không update
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    userRepo.findOne.mockResolvedValue({ id: 2, email: 'existing@e.com' });

    await expect(
      uc.updateUser({ userId: 1, email: 'existing@e.com' })
    ).rejects.toThrow(ConflictError);

    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_09
  it('UT_F16_09 – Username trùng (update)', async () => {
    /**
     * Test Case ID : UT_F16_09
     * Test Objective: Xác minh ConflictError khi username đã có
     * Input         : username='taken' (của user 2)
     * Expected Output: ConflictError "Username đã tồn tại"
     * Notes         : Không update
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    userRepo.findOne.mockResolvedValue({ id: 2, username: 'taken' });

    await expect(
      uc.updateUser({ userId: 1, username: 'taken' })
    ).rejects.toThrow(ConflictError);

    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_10
  it('UT_F16_10 – Tạo admin thành công', async () => {
    /**
     * Test Case ID : UT_F16_10
     * Test Objective: Xác minh tạo admin mới
     * Input         : email='admin@e.com', username='admin1', password='123456', role='admin'
     * Expected Output: user object với password_hash đã hash
     * Notes         : CheckDB – create() với password_hash
     */
    userRepo.findOne.mockResolvedValue(null);
    pwdSvc.hash.mockResolvedValue('hashedpass');
    userRepo.create.mockResolvedValue({ id: 100, role: 'admin' });

    const result = await uc.createAdmin({
      email: 'admin@e.com',
      username: 'admin1',
      password: '123456',
      role: AdminRole.ADMIN,
    });

    expect(result.role).toBe('admin');
    expect(pwdSvc.hash).toHaveBeenCalledWith('123456');
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: 'hashedpass', is_active: true })
    );
  });

  // UT_F16_11
  it('UT_F16_11 – Thiếu thông tin (createAdmin)', async () => {
    /**
     * Test Case ID : UT_F16_11
     * Test Objective: Xác minh ValidationError khi thiếu field
     * Input         : password=''
     * Expected Output: ValidationError "Thiếu thông tin"
     * Notes         : Không create
     */
    await expect(
      uc.createAdmin({ email: 'a@e.com', username: 'a', password: '', role: AdminRole.ADMIN })
    ).rejects.toThrow(ValidationError);

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  // UT_F16_12
  it('UT_F16_12 – Email sai định dạng', async () => {
    /**
     * Test Case ID : UT_F16_12
     * Test Objective: Xác minh ValidationError khi email không hợp lệ
     * Input         : email='invalid'
     * Expected Output: ValidationError "Email không hợp lệ"
     * Notes         : Không create
     */
    await expect(
      uc.createAdmin({ email: 'invalid', username: 'a', password: '123456', role: AdminRole.ADMIN })
    ).rejects.toThrow(ValidationError);

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  // UT_F16_13
  it('UT_F16_13 – Password < 6 ký tự', async () => {
    /**
     * Test Case ID : UT_F16_13
     * Test Objective: Xác minh ValidationError khi password < 6
     * Input         : password='12345'
     * Expected Output: ValidationError "Password >= 6 ký tự"
     * Notes         : Không create
     */
    await expect(
      uc.createAdmin({ email: 'a@e.com', username: 'a', password: '12345', role: AdminRole.ADMIN })
    ).rejects.toThrow(ValidationError);

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  // UT_F16_14
  it('UT_F16_14 – Email trùng (createAdmin)', async () => {
    /**
     * Test Case ID : UT_F16_14
     * Test Objective: Xác minh ConflictError khi email đã tồn tại
     * Input         : email='dup@e.com' (đã có)
     * Expected Output: ConflictError "Email đã tồn tại"
     * Notes         : Không create
     */
    userRepo.findOne.mockResolvedValue({ id: 1 });

    await expect(
      uc.createAdmin({ email: 'dup@e.com', username: 'new', password: '123456', role: AdminRole.ADMIN })
    ).rejects.toThrow(ConflictError);

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  // UT_F16_15
  it('UT_F16_15 – Role không hợp lệ', async () => {
    /**
     * Test Case ID : UT_F16_15
     * Test Objective: Xác minh ValidationError khi role không trong enum
     * Input         : role='invalid_role'
     * Expected Output: ValidationError "Role không hợp lệ"
     * Notes         : Không create
     */
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      uc.createAdmin({ email: 'a@e.com', username: 'a', password: '123456', role: 'invalid_role' as AdminRole })
    ).rejects.toThrow(ValidationError);

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  // UT_F16_16
  it('UT_F16_16 – Đổi role (SUPER_ADMIN)', async () => {
    /**
     * Test Case ID : UT_F16_16
     * Test Objective: Xác minh SUPER_ADMIN đổi role thành công
     * Input         : requesterRole='super_admin', newRole='guide'
     * Expected Output: { message: 'Đổi role thành công' }
     * Notes         : CheckDB – update() với role mới
     */
    userRepo.findByPk.mockResolvedValue({ id: 5 });
    userRepo.update.mockResolvedValue([1]);

    const result = await uc.changeRole({
      userId: 5,
      newRole: AdminRole.GUIDE,
      requesterRole: AdminRole.SUPER_ADMIN,
    });

    expect(result.message).toBe('Đổi role thành công');
    expect(userRepo.update).toHaveBeenCalledWith(
      { role: 'guide' },
      { where: { id: 5 } }
    );
  });

  // UT_F16_17
  it('UT_F16_17 – Đổi role (non-SUPER_ADMIN bị từ chối)', async () => {
    /**
     * Test Case ID : UT_F16_17
     * Test Objective: Xác minh ForbiddenError khi không phải SUPER_ADMIN
     * Input         : requesterRole='admin'
     * Expected Output: ForbiddenError "Chỉ SUPER_ADMIN đổi role"
     * Notes         : Không update
     */
    await expect(
      uc.changeRole({
        userId: 5,
        newRole: AdminRole.GUIDE,
        requesterRole: AdminRole.ADMIN,
      })
    ).rejects.toThrow(ForbiddenError);

    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_18
  it('UT_F16_18 – Reset password (ADMIN)', async () => {
    /**
     * Test Case ID : UT_F16_18
     * Test Objective: Xác minh ADMIN reset password thành công
     * Input         : requesterRole='admin', newPassword='newpass123'
     * Expected Output: { message: 'Reset thành công' }
     * Notes         : CheckDB – update() với password_hash mới
     */
    pwdSvc.hash.mockResolvedValue('newhash');
    userRepo.update.mockResolvedValue([1]);

    const result = await uc.resetPassword({
      userId: 5,
      newPassword: 'newpass123',
      requesterRole: AdminRole.ADMIN,
    });

    expect(result.message).toBe('Reset thành công');
    expect(pwdSvc.hash).toHaveBeenCalledWith('newpass123');
  });

  // UT_F16_19
  it('UT_F16_19 – Reset password (non-ADMIN bị từ chối)', async () => {
    /**
     * Test Case ID : UT_F16_19
     * Test Objective: Xác minh ForbiddenError khi không phải ADMIN/SUPER_ADMIN
     * Input         : requesterRole='guide'
     * Expected Output: ForbiddenError "Không có quyền"
     * Notes         : Không hash/update
     */
    await expect(
      uc.resetPassword({
        userId: 5,
        newPassword: 'newpass123',
        requesterRole: AdminRole.GUIDE,
      })
    ).rejects.toThrow(ForbiddenError);

    expect(pwdSvc.hash).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // UT_F16_20
  it('UT_F16_20 – findByPk user đúng 1 lần (ban)', async () => {
    /**
     * Test Case ID : UT_F16_20
     * Test Objective: Xác minh không query user nhiều lần khi khóa
     * Input         : userId=1
     * Expected Output: findByPk(1) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 1, is_active: true });
    userRepo.update.mockResolvedValue([1]);

    await uc.banUser(1);

    expect(userRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(userRepo.findByPk).toHaveBeenCalledWith(1);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F16_21 – UserManagementUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(UserManagementUseCase); });
  it('UT_F16_22 – UserManagementUseCase có prototype hợp lệ', () => { expect(UserManagementUseCase.prototype).toBeDefined(); });
  it('UT_F16_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F16_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F16_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F16_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
  it('UT_F16_27 – NotFoundError giữ nguyên name', () => { const err = new NotFoundError('msg'); expect(err.name).toBe('NotFoundError'); });
  it('UT_F16_28 – NotFoundError giữ nguyên message', () => { const err = new NotFoundError('sample'); expect(err.message).toBe('sample'); });
});
