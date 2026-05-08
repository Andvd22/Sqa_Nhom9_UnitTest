import {
  ChangePasswordUseCase,
  ValidationError,
  NotFoundError,
  IUserRepository,
  IPasswordService,
} from './F07.src';

function makeUser(passwordHash = 'oldhash', compareResult = true, extra: any = {}) {
  return {
    id: 1,
    password_hash: passwordHash,
    comparePassword: jest.fn().mockResolvedValue(compareResult),
    getDataValue: jest.fn((key: string) => extra[key]),
    ...extra,
  };
}

describe('F07 - Đổi mật khẩu | bám source AuthService.changePassword', () => {
  let repo: jest.Mocked<IUserRepository>;
  let pwd: jest.Mocked<IPasswordService>;
  let uc: ChangePasswordUseCase;

  beforeEach(() => {
    repo = { findByPk: jest.fn(), update: jest.fn() } as any;
    pwd = { hash: jest.fn() } as any;
    uc = new ChangePasswordUseCase(repo, pwd);
  });

  it('UT_F07_01 - Xác minh đổi mật khẩu thành công khi mật khẩu cũ đúng', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' });

    expect(result).toBe(true);
    expect(pwd.hash).toHaveBeenCalledWith('User@654321');
    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'newhash' }, { where: { id: 1 } });
  });

  it('UT_F07_02 - Xác minh ValidationError khi mật khẩu cũ không đúng', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', false));

    await expect(
      uc.execute({ userId: 1, oldPass: 'wrong', newPass: 'User@654321' })
    ).rejects.toThrow(ValidationError);
    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_03 - Xác minh NotFoundError khi userId không tồn tại', async () => {
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 999, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F07_04 - Xác minh ValidationError khi tài khoản Google đổi mật khẩu', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', true, { google_id: 'google-1' }));

    await expect(
      uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_05 - Xác minh ValidationError khi password_hash rỗng', async () => {
    repo.findByPk.mockResolvedValue(makeUser('', true));

    await expect(
      uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_06 - Xác minh ValidationError khi mật khẩu mới trùng mật khẩu cũ', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('samehash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@123456' })
    ).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_07 - Xác minh ValidationError khi mật khẩu mới quá ngắn', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('weakhash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: '123' })
    ).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_08 - Xác minh ValidationError khi confirmPass không khớp newPass', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321', confirmPass: 'different' })
    ).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_09 - Xác minh ValidationError khi update không ảnh hưởng dòng nào', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([0]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_10 - Xác minh findByPk gọi kèm attributes include password_hash', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' });

    expect(repo.findByPk).toHaveBeenCalledWith(1, { attributes: { include: ['password_hash'] } });
  });

  it('UT_F07_11 - Xác minh comparePassword nhận đúng mật khẩu cũ', async () => {
    const user = makeUser();
    repo.findByPk.mockResolvedValue(user);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New@123456' });

    expect(user.comparePassword).toHaveBeenCalledWith('Old@123456');
  });

  it('UT_F07_12 - Xác minh newPass có khoảng trắng vẫn được hash theo source hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash-space');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '   New@123456   ' });

    expect(pwd.hash).toHaveBeenCalledWith('   New@123456   ');
  });

  it('UT_F07_13 - Xác minh ValidationError khi mật khẩu mới rỗng', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('emptyhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '' })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_14 - Xác minh ValidationError khi google_id lấy qua getDataValue', async () => {
    const user = makeUser('oldhash', true, { getDataValue: jest.fn((key: string) => key === 'google_id' ? 'gid-1' : undefined) });
    repo.findByPk.mockResolvedValue(user);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_15 - Xác minh ValidationError khi user có google_id trực tiếp', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', true, { google_id: 'gid-1' }));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_16 - Xác minh ValidationError khi password_hash là null', async () => {
    repo.findByPk.mockResolvedValue(makeUser(null as any, true));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_17 - Xác minh update dùng đúng userId hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 7, oldPass: 'old', newPass: 'new' });

    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'newhash' }, { where: { id: 7 } });
  });

  it('UT_F07_18 - Xác minh hash service lỗi thì không update DB', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockRejectedValue(new Error('hash failed'));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow('hash failed');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_19 - Xác minh confirmPass undefined vẫn thành công theo source hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).resolves.toBe(true);
  });

  it('UT_F07_20 - Xác minh các lớp lỗi giữ đúng status code', () => {
    expect(new ValidationError('msg').statusCode).toBe(400);
    expect(new NotFoundError('msg').statusCode).toBe(404);
  });

  it('UT_F07_21 - Xác minh oldPass rỗng vẫn được đưa vào comparePassword theo source hiện tại', async () => {
    const user = makeUser();
    repo.findByPk.mockResolvedValue(user);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: '', newPass: 'New@123456' });

    expect(user.comparePassword).toHaveBeenCalledWith('');
  });

  it('UT_F07_22 - Xác minh ValidationError khi mật khẩu mới quá dài', async () => {
    const longPassword = 'A@1'.repeat(100);
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('longhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: longPassword })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_23 - Xác minh comparePassword lỗi thì không hash và không update', async () => {
    const user = makeUser();
    user.comparePassword.mockRejectedValue(new Error('compare failed'));
    repo.findByPk.mockResolvedValue(user);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow('compare failed');
    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_24 - Xác minh newPass thiếu chữ hoa vẫn được hash theo source hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'lower@123' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('UT_F07_25 - Xác minh newPass thiếu ký tự đặc biệt vẫn được hash theo source hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New123456' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('UT_F07_26 - Xác minh newPass chỉ khoảng trắng vẫn được hash theo source hiện tại', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('spacehash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '        ' })).resolves.toBe(true);
  });

  it('UT_F07_27 - Xác minh đổi mật khẩu hợp lệ chỉ hash một lần', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New@123456' });

    expect(pwd.hash).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('UT_F07_28 - Xác minh oldPass sai có khoảng trắng thì không được update', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', false));

    await expect(uc.execute({ userId: 1, oldPass: ' Old@123456 ', newPass: 'New@123456' })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_29 - Xác minh password_hash được lấy qua getDataValue khi không có trên property', async () => {
    const user = {
      id: 1,
      password_hash: undefined,
      comparePassword: jest.fn().mockResolvedValue(true),
      getDataValue: jest.fn((key: string) => (key === 'password_hash' ? 'hash-from-db' : undefined)),
    };
    repo.findByPk.mockResolvedValue(user);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).resolves.toBe(true);
    expect(user.password_hash).toBe('hash-from-db');
  });

  it('UT_F07_30 - Xác minh update trả về số nguyên vẫn được xem là cập nhật thành công', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue(1 as any);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});

