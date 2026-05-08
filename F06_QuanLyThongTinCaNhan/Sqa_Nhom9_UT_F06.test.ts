import {
  UpdateUserInfoUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  isValidEmail,
  isValidDisplayName,
  isValidPhone,
  IUserRepository,
} from './F06.src';

const makeRepo = (): jest.Mocked<IUserRepository> =>
  ({
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  }) as any;

describe('F06 - Quan ly thong tin ca nhan | kiem thu theo huong bat loi', () => {
  let repo: jest.Mocked<IUserRepository>;
  let useCase: UpdateUserInfoUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateUserInfoUseCase(repo);
  });

  describe('Luong thanh cong', () => {
    it('UT_F06_01 - Cap nhat so dien thoai hop le thanh cong', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, phone: '0901234567' });

      expect(result.phone).toBe('0901234567');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { phone: '0901234567', id: { ne: 1 } } });
      expect(repo.update).toHaveBeenCalledWith({ phone: '0901234567' }, { where: { id: 1 } });
    });

    it('UT_F06_02 - Cap nhat nhieu truong hop le cung luc', async () => {
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

    it('UT_F06_03 - Truong avatar duoc map sang avatar_url', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, avatar: 'avatar.png' } as any);

      expect(result.avatar_url).toBe('avatar.png');
      expect(repo.update).toHaveBeenCalledWith({ avatar_url: 'avatar.png' }, { where: { id: 1 } });
    });

    it('UT_F06_04 - Email trung email hien tai thi khong kiem tra trung', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'same@e.com' });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, email: 'same@e.com' });

      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({ email: 'same@e.com' }, { where: { id: 1 } });
    });

    it('UT_F06_04A - Co reload thi phai goi reload sau khi cap nhat thanh cong', async () => {
      const reload = jest.fn().mockResolvedValue(undefined);
      repo.findByPk.mockResolvedValue({ id: 1, username: 'Old Name', reload });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, username: 'New Name' });

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('UT_F06_04B - Co getDataValue thi uu tien du lieu tu model sau reload', async () => {
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

    it('UT_F06_04C - Co reload nhung field khong co tren object thi tra ve fallback', async () => {
      const reload = jest.fn().mockResolvedValue(undefined);
      repo.findByPk.mockResolvedValue({ id: 1, reload });
      repo.update.mockResolvedValue([1]);

      const result = await useCase.execute({ userId: 1, gender: 'male' });

      expect(result.gender).toBe('male');
    });
  });

  describe('Validation va dieu kien bien', () => {
    it('UT_F06_05 - Khong co du lieu cap nhat thi bao loi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1 })).rejects.toThrow(ValidationError);
      await expect(useCase.execute({ userId: 1, username: '' })).rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_06 - So dien thoai rong thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1, phone: '' })).rejects.toThrow('So dien thoai khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_07 - avatar_url rong thi khong duoc cap nhat', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });

      await expect(useCase.execute({ userId: 1, avatar_url: '' })).rejects.toThrow(ValidationError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_08 - Email sai dinh dang thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });

      await expect(useCase.execute({ userId: 1, email: 'invalid-email' })).rejects.toThrow('Email khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_09 - Ten chi chua khoang trang thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '   ' })).rejects.toThrow('Ten nguoi dung khong hop le');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_09A - Ten chi co mot ky tu so thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '8' })).rejects.toThrow('Ten nguoi dung khong hop le');
    });

    it('UT_F06_09B - Ten chua script thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });

      await expect(useCase.execute({ userId: 1, username: '<script>alert(1)</script>' })).rejects.toThrow(
        'Ten nguoi dung khong hop le'
      );
    });

    it('UT_F06_09C - So dien thoai khong dung 10 chu so thi bi tu choi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });

      await expect(useCase.execute({ userId: 1, phone: '090abc4567' })).rejects.toThrow('So dien thoai khong hop le');
      await expect(useCase.execute({ userId: 1, phone: '1277128945' })).rejects.toThrow('So dien thoai khong hop le');
    });
  });

  describe('Bat loi nghiep vu', () => {
    it('UT_F06_10 - Nguoi dung khong ton tai thi bao NotFoundError', async () => {
      repo.findByPk.mockResolvedValue(null);

      await expect(useCase.execute({ userId: 999, phone: '0901234567' })).rejects.toThrow(NotFoundError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_11 - Email da ton tai o nguoi dung khac thi chan cap nhat', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, email: 'old@e.com' });
      repo.findOne.mockResolvedValue({ id: 2 });

      await expect(useCase.execute({ userId: 1, email: 'existing@e.com' })).rejects.toThrow(ConflictError);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('UT_F06_12 - Chi cap nhat username thi khong goi kiem tra trung email va phone', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'old' });
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 1, username: 'New Name' });

      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('UT_F06_13 - So dien thoai da ton tai o nguoi dung khac thi bi chan', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, phone: '0900000000' });
      repo.findOne.mockResolvedValue({ id: 2, phone: '0901234567' });

      await expect(useCase.execute({ userId: 1, phone: '0901234567' })).rejects.toThrow(
        'So dien thoai da duoc su dung'
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('Bat loi dependency va side effect', () => {
    it('UT_F06_14 - Update tra ve 0 dong thi phai bao loi', async () => {
      repo.findByPk.mockResolvedValue({ id: 1, username: 'Old' });
      repo.update.mockResolvedValue([0]);

      await expect(useCase.execute({ userId: 1, username: 'New Name' })).rejects.toThrow(ValidationError);
    });

    it('UT_F06_15 - Repository update nem loi thi day loi ra ngoai', async () => {
      repo.findByPk.mockResolvedValue({ id: 1 });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockRejectedValue(new Error('db error'));

      await expect(useCase.execute({ userId: 1, phone: '0912345678' })).rejects.toThrow('db error');
    });

    it('UT_F06_16 - Query kiem tra email trung phai loai tru chinh user hien tai', async () => {
      repo.findByPk.mockResolvedValue({ id: 9, email: 'old@e.com' });
      repo.findOne.mockResolvedValue(null);
      repo.update.mockResolvedValue([1]);

      await useCase.execute({ userId: 9, email: 'new@e.com' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'new@e.com', id: { ne: 9 } } });
    });
  });

  describe('Kiem tra helper', () => {
    it('UT_F06_17 - isValidEmail dung regex hien tai cua source', () => {
      expect(isValidEmail('valid@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('nguyenvan@example.com')).toBe(true);
    });

    it('UT_F06_18 - Helper validate ten va so dien thoai chan du lieu ban', () => {
      expect(isValidDisplayName('Nguyen Van A')).toBe(true);
      expect(isValidDisplayName('   ')).toBe(false);
      expect(isValidDisplayName('8')).toBe(false);
      expect(isValidDisplayName('<script>alert(1)</script>')).toBe(false);

      expect(isValidPhone('0901234567')).toBe(true);
      expect(isValidPhone('090abc4567')).toBe(false);
      expect(isValidPhone('1277128945')).toBe(false);
    });

    it('UT_F06_19 - Cac lop loi giu dung status code', () => {
      expect(new ValidationError('msg').statusCode).toBe(400);
      expect(new NotFoundError('msg').statusCode).toBe(404);
      expect(new ConflictError('msg').statusCode).toBe(409);
    });
  });
});
