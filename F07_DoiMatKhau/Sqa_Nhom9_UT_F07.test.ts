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

describe('F07 - Doi mat khau | bam source AuthService.changePassword', () => {
  let repo: jest.Mocked<IUserRepository>;
  let pwd: jest.Mocked<IPasswordService>;
  let uc: ChangePasswordUseCase;

  beforeEach(() => {
    repo = { findByPk: jest.fn(), update: jest.fn() } as any;
    pwd = { hash: jest.fn() } as any;
    uc = new ChangePasswordUseCase(repo, pwd);
  });

  it('UT_F07_01 - Doi mat khau thanh cong khi mat khau cu dung', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    const result = await uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' });

    expect(result).toBe(true);
    expect(pwd.hash).toHaveBeenCalledWith('User@654321');
    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'newhash' }, { where: { id: 1 } });
  });

  it('UT_F07_02 - Sai mat khau cu thi khong hash va khong update', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', false));

    await expect(
      uc.execute({ userId: 1, oldPass: 'wrong', newPass: 'User@654321' })
    ).rejects.toThrow(ValidationError);
    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_03 - User khong ton tai', async () => {
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 999, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F07_04 - Tai khoan Google bi chan doi mat khau', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', true, { google_id: 'google-1' }));

    await expect(
      uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_05 - Password hash rong la tai khoan khong hop le', async () => {
    repo.findByPk.mockResolvedValue(makeUser('', true));

    await expect(
      uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_06 - Mat khau moi trung mat khau cu van duoc backend xu ly neu comparePassword hop le', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('samehash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@123456' })
    ).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'samehash' }, { where: { id: 1 } });
  });

  it('UT_F07_07 - Mat khau moi yeu van duoc hash theo source contract', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('weakhash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: '123' })
    ).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'weakhash' }, { where: { id: 1 } });
  });

  it('UT_F07_08 - Confirm password khac new password khong duoc backend su dung theo source hien tai', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321', confirmPass: 'different' })
    ).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('UT_F07_09 - Update khong anh huong row nao thi bao loi', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([0]);

    await expect(
      uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F07_10 - findByPk goi kem attributes include password_hash', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'User@123456', newPass: 'User@654321' });

    expect(repo.findByPk).toHaveBeenCalledWith(1, { attributes: { include: ['password_hash'] } });
  });

  it('UT_F07_11 - comparePassword nhan dung mat khau cu', async () => {
    const user = makeUser();
    repo.findByPk.mockResolvedValue(user);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New@123456' });

    expect(user.comparePassword).toHaveBeenCalledWith('Old@123456');
  });

  it('UT_F07_12 - New password co khoang trang van duoc hash nhu source backend', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash-space');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '   New@123456   ' });

    expect(pwd.hash).toHaveBeenCalledWith('   New@123456   ');
  });

  it('UT_F07_13 - New password rong van di qua hash neu mat khau cu dung', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('emptyhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '' })).resolves.toBe(true);
    expect(pwd.hash).toHaveBeenCalledWith('');
  });

  it('UT_F07_14 - User co google_id qua getDataValue bi chan', async () => {
    const user = makeUser('oldhash', true, { getDataValue: jest.fn((key: string) => key === 'google_id' ? 'gid-1' : undefined) });
    repo.findByPk.mockResolvedValue(user);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_15 - User co google_id truc tiep bi chan', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', true, { google_id: 'gid-1' }));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_16 - Password hash null bi tu choi', async () => {
    repo.findByPk.mockResolvedValue(makeUser(null as any, true));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow(ValidationError);
  });

  it('UT_F07_17 - Update dung user id hien tai', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 7, oldPass: 'old', newPass: 'new' });

    expect(repo.update).toHaveBeenCalledWith({ password_hash: 'newhash' }, { where: { id: 7 } });
  });

  it('UT_F07_18 - Hash service throw thi khong update DB', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockRejectedValue(new Error('hash failed'));

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow('hash failed');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_19 - ConfirmPass undefined van thanh cong', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).resolves.toBe(true);
  });

  it('UT_F07_20 - Error classes giu status code', () => {
    expect(new ValidationError('msg').statusCode).toBe(400);
    expect(new NotFoundError('msg').statusCode).toBe(404);
  });

  it('UT_F07_21 - Old password rong van duoc dua vao comparePassword theo backend', async () => {
    const user = makeUser();
    repo.findByPk.mockResolvedValue(user);
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: '', newPass: 'New@123456' });

    expect(user.comparePassword).toHaveBeenCalledWith('');
  });

  it('UT_F07_22 - Mat khau moi rat dai van duoc hash va update', async () => {
    const longPassword = 'A@1'.repeat(100);
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('longhash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: longPassword })).resolves.toBe(true);
    expect(pwd.hash).toHaveBeenCalledWith(longPassword);
  });

  it('UT_F07_23 - comparePassword throw thi khong hash va khong update', async () => {
    const user = makeUser();
    user.comparePassword.mockRejectedValue(new Error('compare failed'));
    repo.findByPk.mockResolvedValue(user);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).rejects.toThrow('compare failed');
    expect(pwd.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_24 - NewPass thieu chu hoa van duoc hash theo source hien tai', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'lower@123' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('UT_F07_25 - NewPass thieu ky tu dac biet van duoc hash theo source hien tai', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('hash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New123456' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });

  it('UT_F07_26 - NewPass chi khoang trang van duoc hash theo source hien tai', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('spacehash');
    repo.update.mockResolvedValue([1]);

    await expect(uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: '        ' })).resolves.toBe(true);
  });

  it('UT_F07_27 - Doi mat khau hop le chi hash mot lan', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue([1]);

    await uc.execute({ userId: 1, oldPass: 'Old@123456', newPass: 'New@123456' });

    expect(pwd.hash).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('UT_F07_28 - Old password sai co khoang trang khong duoc update', async () => {
    repo.findByPk.mockResolvedValue(makeUser('oldhash', false));

    await expect(uc.execute({ userId: 1, oldPass: ' Old@123456 ', newPass: 'New@123456' })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('UT_F07_29 - Neu password_hash khong nam tren property thi lay qua getDataValue va gan lai cho user', async () => {
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

  it('UT_F07_30 - update tra ve so nguyen van duoc xem la cap nhat thanh cong', async () => {
    repo.findByPk.mockResolvedValue(makeUser());
    pwd.hash.mockResolvedValue('newhash');
    repo.update.mockResolvedValue(1 as any);

    await expect(uc.execute({ userId: 1, oldPass: 'old', newPass: 'new' })).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});

