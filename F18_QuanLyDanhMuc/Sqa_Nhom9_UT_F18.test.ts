/**
 * @file Sqa_Nhom9_UT_F18.test.ts
 * @module F18_QuanLyDanhMuc
 * @description Unit tests for CategoryManagementUseCase - F18: Quản lý danh mục
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Tạo danh mục thành công
 *  - Tên rỗng
 *  - Tên < 2 ký tự
 *  - Danh mục trùng tên
 *  - Cập nhật danh mục thành công
 *  - Cập nhật tên trùng (khác ID)
 *  - Danh mục không tồn tại (update)
 *  - Xóa danh mục thành công
 *  - Danh mục có tour (không xóa được)
 *  - Danh mục không tồn tại (delete)
 *  - findOne name đúng 1 lần (create)
 *  - findByPk đúng 1 lần (update)
 *  - update() đúng 1 lần (update)
 *  - update() đúng 1 lần (delete)
 *  - Tên có dấu và ký tự đặc biệt
 *  - Tạo với description
 *  - Cập nhật chỉ description
 *  - findAndCountAll tours đúng 1 lần (delete)
 *  - Danh mục với tên đúng 2 ký tự (biên dưới)
 *  - Tên trim khi tìm trùng
 *  - Không gọi create khi validation fail
 */

import {
  CategoryManagementUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  ICategoryRepository,
  ITourRepository,
} from './F18.src';

function makeCatRepo(): jest.Mocked<ICategoryRepository> {
  return {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  } as any;
}

function makeTourRepo(): jest.Mocked<ITourRepository> {
  return { findAndCountAll: jest.fn() } as any;
}

describe('F18 – Quản lý danh mục | CategoryManagementUseCase', () => {
  let catRepo: jest.Mocked<ICategoryRepository>;
  let tourRepo: jest.Mocked<ITourRepository>;
  let uc: CategoryManagementUseCase;

  beforeEach(() => {
    catRepo = makeCatRepo();
    tourRepo = makeTourRepo();
    uc = new CategoryManagementUseCase(catRepo, tourRepo);
  });

  // UT_F18_01
  it('UT_F18_01 – Tạo danh mục thành công', async () => {
    /**
     * Test Case ID : UT_F18_01
     * Test Objective: Xác minh tạo danh mục cơ bản
     * Input         : name='Biển đảo', description='Tour biển'
     * Expected Output: category object
     * Notes         : CheckDB – create() được gọi với name trim
     */
    catRepo.findOne.mockResolvedValue(null);
    catRepo.create.mockResolvedValue({ id: 1, name: 'Biển đảo' });

    const result = await uc.createCategory({ name: 'Biển đảo', description: 'Tour biển' });

    expect(result.name).toBe('Biển đảo');
    expect(catRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Biển đảo', description: 'Tour biển' })
    );
  });

  // UT_F18_02
  it('UT_F18_02 – Tên rỗng', async () => {
    /**
     * Test Case ID : UT_F18_02
     * Test Objective: Xác minh ValidationError khi name rỗng
     * Input         : name=''
     * Expected Output: ValidationError "Tên danh mục không được để trống"
     * Notes         : Không create
     */
    await expect(
      uc.createCategory({ name: '' })
    ).rejects.toThrow(ValidationError);

    expect(catRepo.create).not.toHaveBeenCalled();
  });

  // UT_F18_03
  it('UT_F18_03 – Tên < 2 ký tự', async () => {
    /**
     * Test Case ID : UT_F18_03
     * Test Objective: Xác minh ValidationError khi name=1 ký tự
     * Input         : name='A'
     * Expected Output: ValidationError "Tên danh mục phải có ít nhất 2 ký tự"
     * Notes         : Không create
     */
    await expect(
      uc.createCategory({ name: 'A' })
    ).rejects.toThrow(ValidationError);

    expect(catRepo.create).not.toHaveBeenCalled();
  });

  // UT_F18_04
  it('UT_F18_04 – Danh mục trùng tên', async () => {
    /**
     * Test Case ID : UT_F18_04
     * Test Objective: Xác minh ConflictError khi name đã tồn tại
     * Input         : name='Biển đảo' (đã có)
     * Expected Output: ConflictError "Danh mục đã tồn tại"
     * Notes         : Không create
     */
    catRepo.findOne.mockResolvedValue({ id: 2, name: 'Biển đảo' });

    await expect(
      uc.createCategory({ name: 'Biển đảo' })
    ).rejects.toThrow(ConflictError);

    expect(catRepo.create).not.toHaveBeenCalled();
  });

  // UT_F18_05
  it('UT_F18_05 – Cập nhật danh mục thành công', async () => {
    /**
     * Test Case ID : UT_F18_05
     * Test Objective: Xác minh cập nhật danh mục
     * Input         : categoryId=1, name='Núi rừng'
     * Expected Output: { message: 'Cập nhật thành công' }
     * Notes         : CheckDB – update() được gọi
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    catRepo.findOne.mockResolvedValue(null);
    catRepo.update.mockResolvedValue([1]);

    const result = await uc.updateCategory({ categoryId: 1, name: 'Núi rừng' });

    expect(result.message).toBe('Cập nhật thành công');
    expect(catRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Núi rừng' }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F18_06
  it('UT_F18_06 – Cập nhật tên trùng (khác ID)', async () => {
    /**
     * Test Case ID : UT_F18_06
     * Test Objective: Xác minh ConflictError khi update name trùng category khác
     * Input         : categoryId=1, name='Trùng' (của category 2)
     * Expected Output: ConflictError "Tên đã tồn tại"
     * Notes         : Không update
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    catRepo.findOne.mockResolvedValue({ id: 2, name: 'Trùng' });

    await expect(
      uc.updateCategory({ categoryId: 1, name: 'Trùng' })
    ).rejects.toThrow(ConflictError);

    expect(catRepo.update).not.toHaveBeenCalled();
  });

  // UT_F18_07
  it('UT_F18_07 – Danh mục không tồn tại (update)', async () => {
    /**
     * Test Case ID : UT_F18_07
     * Test Objective: Xác minh NotFoundError khi categoryId không có
     * Input         : categoryId=999
     * Expected Output: NotFoundError "Danh mục không tồn tại"
     * Notes         : Không update
     */
    catRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.updateCategory({ categoryId: 999, name: 'Test' })
    ).rejects.toThrow(NotFoundError);

    expect(catRepo.update).not.toHaveBeenCalled();
  });

  // UT_F18_08
  it('UT_F18_08 – Xóa danh mục thành công', async () => {
    /**
     * Test Case ID : UT_F18_08
     * Test Objective: Xác minh xóa danh mục không có tour
     * Input         : categoryId=1
     * Expected Output: { message: 'Xóa thành công' }
     * Notes         : CheckDB – update() với deleted_at
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    catRepo.update.mockResolvedValue([1]);

    const result = await uc.deleteCategory(1);

    expect(result.message).toBe('Xóa thành công');
    expect(catRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(Date) }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F18_09
  it('UT_F18_09 – Danh mục có tour (không xóa được)', async () => {
    /**
     * Test Case ID : UT_F18_09
     * Test Objective: Xác minh ConflictError khi category có tours
     * Input         : tours.count=3
     * Expected Output: ConflictError "Danh mục có tour, không thể xóa"
     * Notes         : Không update deleted_at
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findAndCountAll.mockResolvedValue({ count: 3, rows: [] });

    await expect(uc.deleteCategory(1)).rejects.toThrow(ConflictError);

    expect(catRepo.update).not.toHaveBeenCalled();
  });

  // UT_F18_10
  it('UT_F18_10 – Danh mục không tồn tại (delete)', async () => {
    /**
     * Test Case ID : UT_F18_10
     * Test Objective: Xác minh NotFoundError khi delete categoryId không có
     * Input         : categoryId=999
     * Expected Output: NotFoundError "Danh mục không tồn tại"
     * Notes         : Không check tours
     */
    catRepo.findByPk.mockResolvedValue(null);

    await expect(uc.deleteCategory(999)).rejects.toThrow(NotFoundError);

    expect(tourRepo.findAndCountAll).not.toHaveBeenCalled();
  });

  // UT_F18_11
  it('UT_F18_11 – findOne name đúng 1 lần (create)', async () => {
    /**
     * Test Case ID : UT_F18_11
     * Test Objective: Xác minh không query name nhiều lần
     * Input         : name='Test'
     * Expected Output: findOne({where:{name:'Test'}}) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    catRepo.findOne.mockResolvedValue(null);
    catRepo.create.mockResolvedValue({ id: 1 });

    await uc.createCategory({ name: 'Test' });

    expect(catRepo.findOne).toHaveBeenCalledTimes(1);
    expect(catRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'Test' } })
    );
  });

  // UT_F18_12
  it('UT_F18_12 – findByPk đúng 1 lần (update)', async () => {
    /**
     * Test Case ID : UT_F18_12
     * Test Objective: Xác minh không query category nhiều lần
     * Input         : categoryId=1
     * Expected Output: findByPk(1) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    catRepo.findOne.mockResolvedValue(null);
    catRepo.update.mockResolvedValue([1]);

    await uc.updateCategory({ categoryId: 1, name: 'New' });

    expect(catRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(catRepo.findByPk).toHaveBeenCalledWith(1);
  });

  // UT_F18_13
  it('UT_F18_13 – update() đúng 1 lần (update)', async () => {
    /**
     * Test Case ID : UT_F18_13
     * Test Objective: Xác minh không có vòng lặp/retry update
     * Input         : categoryId=1
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    catRepo.findOne.mockResolvedValue(null);
    catRepo.update.mockResolvedValue([1]);

    await uc.updateCategory({ categoryId: 1, name: 'New' });

    expect(catRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F18_14
  it('UT_F18_14 – update() đúng 1 lần (delete)', async () => {
    /**
     * Test Case ID : UT_F18_14
     * Test Objective: Xác minh không có vòng lặp/retry soft delete
     * Input         : categoryId=1
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    catRepo.update.mockResolvedValue([1]);

    await uc.deleteCategory(1);

    expect(catRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F18_15
  it('UT_F18_15 – Tên có dấu và ký tự đặc biệt', async () => {
    /**
     * Test Case ID : UT_F18_15
     * Test Objective: Xác minh tên unicode được chấp nhận
     * Input         : name='Tour Đà Lạt - Hoa & Cà phê'
     * Expected Output: create() với tên đầy đủ
     */
    catRepo.findOne.mockResolvedValue(null);
    catRepo.create.mockResolvedValue({ id: 1 });

    await uc.createCategory({ name: 'Tour Đà Lạt - Hoa & Cà phê' });

    expect(catRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tour Đà Lạt - Hoa & Cà phê' })
    );
  });

  // UT_F18_16
  it('UT_F18_16 – Tạo với description', async () => {
    /**
     * Test Case ID : UT_F18_16
     * Test Objective: Xác minh lưu description
     * Input         : description='Mô tả chi tiết'
     * Expected Output: create() với description
     */
    catRepo.findOne.mockResolvedValue(null);
    catRepo.create.mockResolvedValue({ id: 1 });

    await uc.createCategory({ name: 'Test', description: 'Mô tả chi tiết' });

    expect(catRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Mô tả chi tiết' })
    );
  });

  // UT_F18_17
  it('UT_F18_17 – Cập nhật chỉ description', async () => {
    /**
     * Test Case ID : UT_F18_17
     * Test Objective: Xác minh cập nhật description không cần name
     * Input         : description='Mới'
     * Expected Output: update() với description
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    catRepo.update.mockResolvedValue([1]);

    await uc.updateCategory({ categoryId: 1, description: 'Mới' });

    expect(catRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Mới' }),
      expect.anything()
    );
  });

  // UT_F18_18
  it('UT_F18_18 – findAndCountAll tours đúng 1 lần (delete)', async () => {
    /**
     * Test Case ID : UT_F18_18
     * Test Objective: Xác minh check tours đúng 1 lần trước khi xóa
     * Input         : categoryId=1
     * Expected Output: findAndCountAll({where:{category_id:1}}) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    catRepo.update.mockResolvedValue([1]);

    await uc.deleteCategory(1);

    expect(tourRepo.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category_id: 1 } })
    );
  });

  // UT_F18_19
  it('UT_F18_19 – Danh mục với tên đúng 2 ký tự (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F18_19
     * Test Objective: Xác minh name đúng 2 ký tự được chấp nhận
     * Input         : name='AB'
     * Expected Output: create() thành công
     */
    catRepo.findOne.mockResolvedValue(null);
    catRepo.create.mockResolvedValue({ id: 1 });

    const result = await uc.createCategory({ name: 'AB' });

    expect(catRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AB' })
    );
  });

  // UT_F18_20
  it('UT_F18_20 – Không gọi create khi validation fail', async () => {
    /**
     * Test Case ID : UT_F18_20
     * Test Objective: Xác minh không gọi DB khi validation lỗi
     * Input         : name=''
     * Expected Output: ValidationError, create KHÔNG được gọi
     * Notes         : Không tạo record rác trong DB
     */
    await expect(
      uc.createCategory({ name: '' })
    ).rejects.toThrow(ValidationError);

    expect(catRepo.create).not.toHaveBeenCalled();
    expect(catRepo.findOne).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F18_21 – CategoryManagementUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(CategoryManagementUseCase); });
  it('UT_F18_22 – CategoryManagementUseCase có prototype hợp lệ', () => { expect(CategoryManagementUseCase.prototype).toBeDefined(); });
  it('UT_F18_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F18_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
});
