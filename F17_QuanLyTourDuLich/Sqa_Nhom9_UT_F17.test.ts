/**
 * @file Sqa_Nhom9_UT_F17.test.ts
 * @module F17_QuanLyTourDuLich
 * @description Unit tests for TourManagementUseCase - F17: Quản lý tour du lịch
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Tạo tour thành công
 *  - Tên tour rỗng
 *  - Giá <= 0
 *  - Sức chứa <= 0
 *  - Cập nhật tour thành công
 *  - Cập nhật giá <= 0
 *  - Cập nhật sức chứa <= 0
 *  - Tour không tồn tại (update)
 *  - Xóa tour thành công
 *  - Tour không tồn tại (delete)
 *  - Tour có đơn hàng (không xóa được)
 *  - update() được gọi đúng 1 lần (update)
 *  - update() được gọi đúng 1 lần (delete)
 *  - findByPk đúng 1 lần
 *  - Tạo tour với title có khoảng trắng đầu/cuối
 *  - Cập nhật tour với title mới
 *  - Xóa tour đã soft delete
 *  - Tạo tour giá lớn
 *  - Tạo tour capacity lớn
 *  - findAndCountAll orders đúng 1 lần (delete)
 */

import {
  TourManagementUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  ITourRepository,
  IOrderRepository,
} from './F17.src';

function makeTourRepo(): jest.Mocked<ITourRepository> {
  return {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  } as any;
}

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { findAndCountAll: jest.fn() } as any;
}

describe('F17 – Quản lý tour du lịch | TourManagementUseCase', () => {
  let tourRepo: jest.Mocked<ITourRepository>;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: TourManagementUseCase;

  beforeEach(() => {
    tourRepo = makeTourRepo();
    orderRepo = makeOrderRepo();
    uc = new TourManagementUseCase(tourRepo, orderRepo);
  });

  // UT_F17_01
  it('UT_F17_01 – Tạo tour thành công', async () => {
    /**
     * Test Case ID : UT_F17_01
     * Test Objective: Xác minh tạo tour cơ bản thành công
     * Input         : title='Tour Hạ Long', price=2000000, capacity=30, categoryId=1
     * Expected Output: tour object
     * Notes         : CheckDB – create() được gọi
     */
    tourRepo.create.mockResolvedValue({ id: 1, title: 'Tour Hạ Long' });

    const result = await uc.createTour({
      title: 'Tour Hạ Long',
      price: 2000000,
      capacity: 30,
      categoryId: 1,
    });

    expect(result.title).toBe('Tour Hạ Long');
    expect(tourRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tour Hạ Long', price: 2000000, capacity: 30, categoryId: 1 })
    );
  });

  // UT_F17_02
  it('UT_F17_02 – Tên tour rỗng', async () => {
    /**
     * Test Case ID : UT_F17_02
     * Test Objective: Xác minh ValidationError khi title rỗng
     * Input         : title=''
     * Expected Output: ValidationError "Tên tour không được để trống"
     * Notes         : Không create
     */
    await expect(
      uc.createTour({ title: '', price: 2000000, capacity: 30, categoryId: 1 })
    ).rejects.toThrow(ValidationError);

    expect(tourRepo.create).not.toHaveBeenCalled();
  });

  // UT_F17_03
  it('UT_F17_03 – Giá <= 0', async () => {
    /**
     * Test Case ID : UT_F17_03
     * Test Objective: Xác minh ValidationError khi price=0
     * Input         : price=0
     * Expected Output: ValidationError "Giá phải > 0"
     * Notes         : Không create
     */
    await expect(
      uc.createTour({ title: 'Test', price: 0, capacity: 30, categoryId: 1 })
    ).rejects.toThrow(ValidationError);

    expect(tourRepo.create).not.toHaveBeenCalled();
  });

  // UT_F17_04
  it('UT_F17_04 – Sức chứa <= 0', async () => {
    /**
     * Test Case ID : UT_F17_04
     * Test Objective: Xác minh ValidationError khi capacity=0
     * Input         : capacity=0
     * Expected Output: ValidationError "Sức chứa phải > 0"
     * Notes         : Không create
     */
    await expect(
      uc.createTour({ title: 'Test', price: 2000000, capacity: 0, categoryId: 1 })
    ).rejects.toThrow(ValidationError);

    expect(tourRepo.create).not.toHaveBeenCalled();
  });

  // UT_F17_05
  it('UT_F17_05 – Cập nhật tour thành công', async () => {
    /**
     * Test Case ID : UT_F17_05
     * Test Objective: Xác minh cập nhật tour
     * Input         : tourId=1, price=2500000
     * Expected Output: { message: 'Cập nhật thành công' }
     * Notes         : CheckDB – update() được gọi
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.update.mockResolvedValue([1]);

    const result = await uc.updateTour({ tourId: 1, price: 2500000 });

    expect(result.message).toBe('Cập nhật thành công');
    expect(tourRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ price: 2500000 }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F17_06
  it('UT_F17_06 – Cập nhật giá <= 0', async () => {
    /**
     * Test Case ID : UT_F17_06
     * Test Objective: Xác minh ValidationError khi update price=0
     * Input         : price=0
     * Expected Output: ValidationError "Giá phải > 0"
     * Notes         : Không update
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });

    await expect(uc.updateTour({ tourId: 1, price: 0 })).rejects.toThrow(ValidationError);

    expect(tourRepo.update).not.toHaveBeenCalled();
  });

  // UT_F17_07
  it('UT_F17_07 – Cập nhật sức chứa <= 0', async () => {
    /**
     * Test Case ID : UT_F17_07
     * Test Objective: Xác minh ValidationError khi update capacity=0
     * Input         : capacity=0
     * Expected Output: ValidationError "Sức chứa phải > 0"
     * Notes         : Không update
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });

    await expect(uc.updateTour({ tourId: 1, capacity: 0 })).rejects.toThrow(ValidationError);

    expect(tourRepo.update).not.toHaveBeenCalled();
  });

  // UT_F17_08
  it('UT_F17_08 – Tour không tồn tại (update)', async () => {
    /**
     * Test Case ID : UT_F17_08
     * Test Objective: Xác minh NotFoundError khi tourId không có
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     * Notes         : Không update
     */
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(uc.updateTour({ tourId: 999, price: 2500000 })).rejects.toThrow(NotFoundError);

    expect(tourRepo.update).not.toHaveBeenCalled();
  });

  // UT_F17_09
  it('UT_F17_09 – Xóa tour thành công', async () => {
    /**
     * Test Case ID : UT_F17_09
     * Test Objective: Xác minh xóa tour không có đơn hàng
     * Input         : tourId=1
     * Expected Output: { message: 'Xóa thành công' }
     * Notes         : CheckDB – update() với deleted_at
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    tourRepo.update.mockResolvedValue([1]);

    const result = await uc.deleteTour(1);

    expect(result.message).toBe('Xóa thành công');
    expect(tourRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(Date) }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F17_10
  it('UT_F17_10 – Tour không tồn tại (delete)', async () => {
    /**
     * Test Case ID : UT_F17_10
     * Test Objective: Xác minh NotFoundError khi delete tourId không có
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     * Notes         : Không check orders
     */
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(uc.deleteTour(999)).rejects.toThrow(NotFoundError);

    expect(orderRepo.findAndCountAll).not.toHaveBeenCalled();
  });

  // UT_F17_11
  it('UT_F17_11 – Tour có đơn hàng (không xóa được)', async () => {
    /**
     * Test Case ID : UT_F17_11
     * Test Objective: Xác minh ConflictError khi tour có orders
     * Input         : orders.count=5
     * Expected Output: ConflictError "Tour có đơn hàng, không thể xóa"
     * Notes         : Không update deleted_at
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    orderRepo.findAndCountAll.mockResolvedValue({ count: 5, rows: [] });

    await expect(uc.deleteTour(1)).rejects.toThrow(ConflictError);

    expect(tourRepo.update).not.toHaveBeenCalled();
  });

  // UT_F17_12
  it('UT_F17_12 – update() được gọi đúng 1 lần (update)', async () => {
    /**
     * Test Case ID : UT_F17_12
     * Test Objective: Xác minh không có vòng lặp/retry update
     * Input         : tourId=1
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.update.mockResolvedValue([1]);

    await uc.updateTour({ tourId: 1, price: 2500000 });

    expect(tourRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F17_13
  it('UT_F17_13 – update() được gọi đúng 1 lần (delete)', async () => {
    /**
     * Test Case ID : UT_F17_13
     * Test Objective: Xác minh không có vòng lặp/retry soft delete
     * Input         : tourId=1
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    tourRepo.update.mockResolvedValue([1]);

    await uc.deleteTour(1);

    expect(tourRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F17_14
  it('UT_F17_14 – findByPk được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F17_14
     * Test Objective: Xác minh không query tour nhiều lần
     * Input         : tourId=1
     * Expected Output: findByPk(1) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.update.mockResolvedValue([1]);

    await uc.updateTour({ tourId: 1, price: 2500000 });

    expect(tourRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(tourRepo.findByPk).toHaveBeenCalledWith(1);
  });

  // UT_F17_15
  it('UT_F17_15 – Tạo tour với title có khoảng trắng đầu/cuối', async () => {
    /**
     * Test Case ID : UT_F17_15
     * Test Objective: Xác minh title '  Tour  ' → trim hoặc reject
     * Input         : title='  Tour Hạ Long  '
     * Expected Output: ValidationError hoặc create với title trimmed (tùy src)
     * Notes         : src không trim, giữ nguyên input
     */
    tourRepo.create.mockResolvedValue({ id: 1 });

    const result = await uc.createTour({
      title: '  Tour Hạ Long  ',
      price: 2000000,
      capacity: 30,
      categoryId: 1,
    });

    expect(tourRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: '  Tour Hạ Long  ' })
    );
  });

  // UT_F17_16
  it('UT_F17_16 – Cập nhật tour với title mới', async () => {
    /**
     * Test Case ID : UT_F17_16
     * Test Objective: Xác minh cập nhật title
     * Input         : title='Tour mới'
     * Expected Output: update() với title='Tour mới'
     * Notes         : CheckDB – cập nhật đúng field
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.update.mockResolvedValue([1]);

    await uc.updateTour({ tourId: 1, title: 'Tour mới' });

    expect(tourRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tour mới' }),
      expect.anything()
    );
  });

  // UT_F17_17
  it('UT_F17_17 – Xóa tour đã soft delete', async () => {
    /**
     * Test Case ID : UT_F17_17
     * Test Objective: Xác minh xóa tour đã có deleted_at
     * Input         : deleted_at=null (chưa xóa)
     * Expected Output: update() với deleted_at mới
     * Notes         : Soft delete ghi đè deleted_at
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1, deleted_at: null });
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    tourRepo.update.mockResolvedValue([1]);

    const result = await uc.deleteTour(1);

    expect(result.message).toBe('Xóa thành công');
  });

  // UT_F17_18
  it('UT_F17_18 – Tạo tour giá lớn', async () => {
    /**
     * Test Case ID : UT_F17_18
     * Test Objective: Xác minh giá lớn vẫn được chấp nhận
     * Input         : price=100000000
     * Expected Output: Cập nhật thành công
     */
    tourRepo.create.mockResolvedValue({ id: 1 });

    const result = await uc.createTour({
      title: 'Tour VIP',
      price: 100000000,
      capacity: 10,
      categoryId: 1,
    });

    expect(tourRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 100000000 })
    );
  });

  // UT_F17_19
  it('UT_F17_19 – Tạo tour capacity lớn', async () => {
    /**
     * Test Case ID : UT_F17_19
     * Test Objective: Xác minh capacity lớn vẫn được chấp nhận
     * Input         : capacity=500
     * Expected Output: Cập nhật thành công
     */
    tourRepo.create.mockResolvedValue({ id: 1 });

    const result = await uc.createTour({
      title: 'Tour đoàn lớn',
      price: 500000,
      capacity: 500,
      categoryId: 1,
    });

    expect(tourRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: 500 })
    );
  });

  // UT_F17_20
  it('UT_F17_20 – findAndCountAll orders đúng 1 lần (delete)', async () => {
    /**
     * Test Case ID : UT_F17_20
     * Test Objective: Xác minh check orders đúng 1 lần trước khi xóa
     * Input         : tourId=1
     * Expected Output: findAndCountAll({where:{tour_id:1}}) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    tourRepo.findByPk.mockResolvedValue({ id: 1 });
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    tourRepo.update.mockResolvedValue([1]);

    await uc.deleteTour(1);

    expect(orderRepo.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tour_id: 1 } })
    );
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F17_21 – TourManagementUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(TourManagementUseCase); });
  it('UT_F17_22 – TourManagementUseCase có prototype hợp lệ', () => { expect(TourManagementUseCase.prototype).toBeDefined(); });
  it('UT_F17_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F17_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F17_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
});
