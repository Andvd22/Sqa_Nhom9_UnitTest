import {
  UpdateUserInfoUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  isValidEmail,
  IUserRepository,
} from './F06.src';

const makeRepo = (): jest.Mocked<IUserRepository> =>
  ({
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  }) as any;

describe('F06 - Quản lý thông tin cá nhân | kiểm thử theo hướng bắt lỗi', () => {
  let repo: jest.Mocked<IUserRepository>;
  let useCase: UpdateUserInfoUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateUserInfoUseCase(repo);
  });

  describe('Luồng thành công', () => {
    it('UT_F06_01 - Xác minh cập nhật số điện thoại hợp lệ thành công', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, phone: '0901234567' });

      expect(result.phone).toBe('0901234567');
      expect(repo.update).toHaveBeenCalledWith({ phone: '0901234567' }, { where: { id: 1 } });
    });

    it('UT_F06_02 - Xác minh cập nhật nhiều trường hợp lệ cùng lúc', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com', phone: '0900000000', username: 'Old Name' });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({
        userId: 1,
        username: 'Nguyen Van A',
        email: 'new@e.com',
        phone: '0912345678',
        gender: 'male',
      });

      expect(result).toEqual(
        expect.objectContaining({
          username: 'Nguyen Van A',
          email: 'new@e.com',
          phone: '0912345678',
          gender: 'male',
        })
      );
    });

    it('UT_F06_03 - Xác minh trường avatar được map sang avatar_url', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, avatar: 'avatar.png' } as any);

      expect(result.avatar_url).toBe('avatar.png');
      expect(repo.update).toHaveBeenCalledWith({ avatar_url: 'avatar.png' }, { where: { id: 1 } });
    });

    it('UT_F06_04 - Xác minh email trùng email hiện tại thì không kiểm tra trùng', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'same@e.com' });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, email: 'same@e.com' });

      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({ email: 'same@e.com' }, { where: { id: 1 } });
    });

    it('UT_F06_05 - Xác minh có reload thì phải gọi reload sau khi cập nhật thành công', async () => {
      const reload = jest.fn().mockResolvedValue(undefined);
      repo.findByPk.mockResolvedValue({ id: 1, username: 'Old Name', reload });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, username: 'New Name' });

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('UT_F06_06 - Xác minh có getDataValue thì ưu tiên dữ liệu từ model sau reload', async () => {
      const reload = jest.fn().mockResolvedValue(undefined);
      const getDataValue = jest.fn((key: string) => {
        const values: Record<string, any> = {
          id: 1,
          username: 'Reloaded Name',
          email: 'reloaded@e.com',
          phone: '0999999999',
          avatar_url: 'reloaded.png',
          gender: 'female',
        };
        return values[key];
      });
      repo.findByPk.mockResolvedValue({ id: 1, username: 'Old Name', reload, getDataValue });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({
        userId: 1,
        username: 'New Name',
        email: 'new@e.com',
        phone: '0912345678',
        avatar_url: 'avatar.png',
        gender: 'male',
      });

      expect(result).toEqual({
        id: 1,
        username: 'Reloaded Name',
        email: 'reloaded@e.com',
        phone: '0999999999',
        avatar_url: 'reloaded.png',
        gender: 'female',
      });
    });

    it('UT_F06_07 - Xác minh có reload nhưng field không có trên object thì trả về fallback', async () => {
      const reload = jest.fn().mockResolvedValue(undefined);
      repo.findByPk.mockResolvedValue({ id: 1, reload });
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, gender: 'male' });

      expect(result.gender).toBe('male');
    });
  });

  describe('Validation và điều kiện biên', () => {
    it('UT_F06_08 - Xác minh ValidationError khi không có dữ liệu cập nhật', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1 })).rejects.toThrow(ValidationError);
      await expect(useCase.execute({ userId: 1, username: '' })).rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_09 - Xác minh ValidationError khi số điện thoại rỗng', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1, phone: '' })).rejects.toThrow('So dien thoai khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_10 - Xác minh avatar_url rỗng thì không được cập nhật', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1, avatar_url: '' })).rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_11 - Xác minh ValidationError khi email sai định dạng', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });

      await expect(useCase.execute({ userId: 1, email: 'invalid-email' })).rejects.toThrow('Email khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_12 - Xác minh ValidationError khi tên chỉ chứa khoảng trắng', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '   ' })).rejects.toThrow('Ten nguoi dung khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_13 - Xác minh ValidationError khi tên chỉ có một ký tự số', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '8' })).rejects.toThrow('Ten nguoi dung khong hop le');
    });

    it('UT_F06_14 - Xác minh ValidationError khi tên chứa script', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '<script>alert(1)</script>' })).rejects.toThrow(
        'Ten nguoi dung khong hop le'
      );
    });

    it('UT_F06_15 - Xác minh ValidationError khi số điện thoại không đúng 10 chữ số', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });

      await expect(useCase.execute({ userId: 1, phone: '090abc4567' })).rejects.toThrow('So dien thoai khong hop le');
      await expect(useCase.execute({ userId: 1, phone: '1277128945' })).rejects.toThrow('So dien thoai khong hop le');
    });
  });

  describe('Bắt lỗi nghiệp vụ', () => {
    it('UT_F06_16 - Xác minh NotFoundError khi người dùng không tồn tại', async () => {
      repo.findByPk.mockResolvedValue(null);

      await expect(useCase.execute({ userId: 999, phone: '0901234567' })).rejects.toThrow(NotFoundError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_17 - Xác minh email đã tồn tại ở người dùng khác thì chặn cập nhật', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });
      repo.findOne.mockResolvedValue({ id: 2 });

      await expect(useCase.execute({ userId: 1, email: 'existing@e.com' })).rejects.toThrow(ConflictError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_18 - Xác minh chỉ cập nhật username thì không gọi kiểm tra trùng email và phone', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, username: 'New Name' });

      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('UT_F06_19 - Xác minh số điện thoại đã tồn tại ở người dùng khác thì bị chặn', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });
      repo.findOne.mockResolvedValue({ id: 2, phone: '0901234567' });

      await expect(useCase.execute({ userId: 1, phone: '0901234567' })).rejects.toThrow(
        'So dien thoai da duoc su dung'
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('Bắt lỗi dependency và side effect', () => {
    it('UT_F06_20 - Xác minh ValidationError khi update trả về 0 dòng', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'Old' });
      repo.update.mockResolvedValue([0]);

      await expect(useCase.execute({ userId: 1, username: 'New Name' })).rejects.toThrow(ValidationError);
    });

    it('UT_F06_21 - Xác minh repository update ném lỗi thì đẩy lỗi ra ngoài', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockRejectedValue(new Error('db error'));

      await expect(useCase.execute({ userId: 1, phone: '0912345678' })).rejects.toThrow('db error');
    });

    it('UT_F06_22 - Xác minh query kiểm tra email trùng phải loại trừ chính user hiện tại', async () => {
      repo.findByPk.mockResolvedValue({ id: 9, email: 'old@e.com' });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 9, email: 'new@e.com' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'new@e.com', id: { ne: 9 } } });
    });
  });

  describe('Kiểm tra helper', () => {
    it('UT_F06_23 - Xác minh isValidEmail dùng đúng regex hiện tại của source', () => {
      expect(isValidEmail('valid@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('nguyenvan@example.com')).toBe(true);
    });

    it('UT_F06_24 - Xác minh các lớp lỗi giữ đúng status code', () => {
      expect(new ValidationError('msg').statusCode).toBe(400);
      expect(new NotFoundError('msg').statusCode).toBe(404);
      expect(new ConflictError('msg').statusCode).toBe(409);
    });
  });
});
