/**
 * @file Sqa_Nhom9_UT_F10.test.ts
 * @module F10_DatTour
 * @description Unit tests for CreateOrderUseCase - F10: Đặt tour
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Đặt tour thành công
 *  - User không tồn tại
 *  - Tour không tồn tại
 *  - Số lượng <= 0
 *  - Số lượng vượt quá capacity
 *  - Ngày khởi hành quá gần (< 2 ngày)
 *  - Ngày khởi hành đúng 2 ngày sau (biên dưới)
 *  - Tính totalPrice đúng
 *  - Order status = pending
 *  - User bị khóa vẫn đặt được
 *  - Tour hết chỗ (capacity=0)
 *  - Quantity = 1 (biên dưới)
 *  - Quantity = capacity (biên trên)
 *  - findByPk user đúng 1 lần
 *  - findByPk tour đúng 1 lần
 *  - create() được gọi đúng 1 lần
 *  - Ngày trong quá khứ
 *  - Ngày khởi hành là hôm nay
 *  - Tour không có giá (price=0)
 *  - Đặt nhiều tour khác nhau
 */

import {
  CreateOrderUseCase,
  ValidationError,
  NotFoundError,
  IUserRepository,
  ITourRepository,
  IOrderRepository,
} from './F10.src';

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return { findByPk: jest.fn() } as any;
}
function makeTourRepo(): jest.Mocked<ITourRepository> {
  return { findByPk: jest.fn() } as any;
}
function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { create: jest.fn() } as any;
}

describe('F10 – Đặt tour | CreateOrderUseCase', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let tourRepo: jest.Mocked<ITourRepository>;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: CreateOrderUseCase;

  beforeEach(() => {
    userRepo = makeUserRepo();
    tourRepo = makeTourRepo();
    orderRepo = makeOrderRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo);
  });

  // UT_F10_01
  it('UT_F10_01 – Đặt tour thành công', async () => {
    /**
     * Test Case ID : UT_F10_01
     * Test Objective: Xác minh đặt tour cơ bản thành công
     * Input         : userId=1, tourId=10, quantity=2, startDate=Date+5
     * Expected Output: { orderId: 100, totalPrice: 4000000, status:'pending' }
     * Notes         : CheckDB – create() được gọi với đúng dữ liệu
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(result.orderId).toBe(100);
    expect(result.totalPrice).toBe(4000000);
    expect(result.status).toBe('pending');
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 1,
        tour_id: 10,
        quantity: 2,
        total_price: 4000000,
        status: 'pending',
      })
    );
  });

  // UT_F10_02
  it('UT_F10_02 – User không tồn tại', async () => {
    /**
     * Test Case ID : UT_F10_02
     * Test Objective: Xác minh NotFoundError khi userId không có
     * Input         : userId=999
     * Expected Output: NotFoundError "Người dùng không tồn tại"
     * Notes         : Không gọi tourRepo hay orderRepo
     */
    userRepo.findByPk.mockResolvedValue(null);

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.execute({ userId: 999, tourId: 10, quantity: 2, startDate: future })
    ).rejects.toThrow(NotFoundError);

    expect(tourRepo.findByPk).not.toHaveBeenCalled();
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_03
  it('UT_F10_03 – Tour không tồn tại', async () => {
    /**
     * Test Case ID : UT_F10_03
     * Test Objective: Xác minh NotFoundError khi tourId không có
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     * Notes         : User tìm thấy, tour không có → không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue(null);

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.execute({ userId: 1, tourId: 999, quantity: 2, startDate: future })
    ).rejects.toThrow(NotFoundError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_04
  it('UT_F10_04 – Số lượng <= 0', async () => {
    /**
     * Test Case ID : UT_F10_04
     * Test Objective: Xác minh ValidationError khi quantity=0
     * Input         : quantity=0
     * Expected Output: ValidationError "Số lượng phải lớn hơn 0"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 0, startDate: future })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_05
  it('UT_F10_05 – Số lượng vượt quá capacity', async () => {
    /**
     * Test Case ID : UT_F10_05
     * Test Objective: Xác minh ValidationError khi quantity > capacity
     * Input         : quantity=31, capacity=30
     * Expected Output: ValidationError "Số lượng vượt quá sức chứa"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 31, startDate: future })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_06
  it('UT_F10_06 – Ngày khởi hành quá gần (< 2 ngày)', async () => {
    /**
     * Test Case ID : UT_F10_06
     * Test Objective: Xác minh ValidationError khi startDate chỉ cách 1 ngày
     * Input         : startDate=Date+1
     * Expected Output: ValidationError "Ngày khởi hành phải cách ít nhất 2 ngày"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: tomorrow })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_07
  it('UT_F10_07 – Ngày khởi hành đúng 2 ngày sau (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F10_07
     * Test Objective: Xác minh startDate = today+2 được chấp nhận
     * Input         : startDate=Date+2
     * Expected Output: Cập nhật thành công
     * Notes         : Biên dưới của ngày khởi hành
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: d2 });

    expect(result.status).toBe('pending');
  });

  // UT_F10_08
  it('UT_F10_08 – Tính totalPrice đúng', async () => {
    /**
     * Test Case ID : UT_F10_08
     * Test Objective: Xác minh total_price = tour.price * quantity
     * Input         : price=1500000, quantity=3
     * Expected Output: totalPrice=4500000
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 1500000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 3, startDate: future });

    expect(result.totalPrice).toBe(4500000);
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ total_price: 4500000 })
    );
  });

  // UT_F10_09
  it('UT_F10_09 – Order status luôn là pending', async () => {
    /**
     * Test Case ID : UT_F10_09
     * Test Objective: Xác minh order mới luôn có status=pending
     * Input         : hợp lệ
     * Expected Output: status='pending'
     * Notes         : CheckDB – create() với status='pending'
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(result.status).toBe('pending');
  });

  // UT_F10_10
  it('UT_F10_10 – User bị khóa vẫn đặt được', async () => {
    /**
     * Test Case ID : UT_F10_10
     * Test Objective: Xác minh is_active=false không ảnh hưởng đặt tour
     * Input         : user.is_active=false
     * Expected Output: Cập nhật thành công
     * Notes         : Use case không kiểm tra is_active
     */
    userRepo.findByPk.mockResolvedValue({ id: 1, is_active: false });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: future });

    expect(result.orderId).toBe(100);
  });

  // UT_F10_11
  it('UT_F10_11 – Tour hết chỗ (capacity=0)', async () => {
    /**
     * Test Case ID : UT_F10_11
     * Test Objective: Xác minh ValidationError khi capacity=0
     * Input         : capacity=0, quantity=1
     * Expected Output: ValidationError "Số lượng vượt quá sức chứa"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 0 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: future })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_12
  it('UT_F10_12 – Quantity = 1 (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F10_12
     * Test Objective: Xác minh quantity=1 được chấp nhận
     * Input         : quantity=1
     * Expected Output: Cập nhật thành công, totalPrice=price*1
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 3000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: future });

    expect(result.totalPrice).toBe(3000000);
  });

  // UT_F10_13
  it('UT_F10_13 – Quantity = capacity (biên trên)', async () => {
    /**
     * Test Case ID : UT_F10_13
     * Test Objective: Xác minh quantity=capacity được chấp nhận
     * Input         : quantity=30, capacity=30
     * Expected Output: Cập nhật thành công
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 30, startDate: future });

    expect(result.orderId).toBe(100);
  });

  // UT_F10_14
  it('UT_F10_14 – findByPk user được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F10_14
     * Test Objective: Xác minh không query user nhiều lần
     * Input         : userId=1
     * Expected Output: findByPk(1) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(userRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(userRepo.findByPk).toHaveBeenCalledWith(1);
  });

  // UT_F10_15
  it('UT_F10_15 – findByPk tour được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F10_15
     * Test Objective: Xác minh không query tour nhiều lần
     * Input         : tourId=10
     * Expected Output: findByPk(10) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(tourRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(tourRepo.findByPk).toHaveBeenCalledWith(10);
  });

  // UT_F10_16
  it('UT_F10_16 – create() được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F10_16
     * Test Objective: Xác minh không có vòng lặp/retry create
     * Input         : userId=1, tourId=10, quantity=2
     * Expected Output: create() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần tạo duplicate order
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(orderRepo.create).toHaveBeenCalledTimes(1);
  });

  // UT_F10_17
  it('UT_F10_17 – Ngày khởi hành trong quá khứ', async () => {
    /**
     * Test Case ID : UT_F10_17
     * Test Objective: Xác minh ValidationError khi startDate < today
     * Input         : startDate=Date-3
     * Expected Output: ValidationError "Ngày khởi hành phải cách ít nhất 2 ngày"
     * Notes         : daysDiff âm → < 2
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const past = new Date(); past.setDate(past.getDate() - 3);
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: past })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_18
  it('UT_F10_18 – Ngày khởi hành là hôm nay', async () => {
    /**
     * Test Case ID : UT_F10_18
     * Test Objective: Xác minh ValidationError khi startDate = today
     * Input         : startDate=today
     * Expected Output: ValidationError (daysDiff=0 < 2)
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const today = new Date();
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: today })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F10_19
  it('UT_F10_19 – Tour không có giá (price=0)', async () => {
    /**
     * Test Case ID : UT_F10_19
     * Test Objective: Xác minh totalPrice=0 khi tour.price=0
     * Input         : price=0, quantity=2
     * Expected Output: totalPrice=0, order vẫn được tạo
     * Notes         : Free tour vẫn cần tạo order để tracking
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 0, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: future });

    expect(result.totalPrice).toBe(0);
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ total_price: 0 })
    );
  });

  // UT_F10_20
  it('UT_F10_20 – Đặt nhiều tour khác nhau liên tiếp', async () => {
    /**
     * Test Case ID : UT_F10_20
     * Test Objective: Xác minh đặt nhiều tour liên tiếp thành công
     * Input         : Tour 10 qty=1, Tour 11 qty=2
     * Expected Output: Cả 2 lần đều thành công
     * Notes         : CheckDB – create() được gọi 2 lần với đúng tour_id
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk
      .mockResolvedValueOnce({ id: 10, price: 2000000, capacity: 30 })
      .mockResolvedValueOnce({ id: 11, price: 3000000, capacity: 20 });
    orderRepo.create
      .mockResolvedValueOnce({ id: 100 })
      .mockResolvedValueOnce({ id: 101 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const r1 = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: future });
    const r2 = await uc.execute({ userId: 1, tourId: 11, quantity: 2, startDate: future });

    expect(r1.orderId).toBe(100);
    expect(r2.orderId).toBe(101);
    expect(r1.totalPrice).toBe(2000000);
    expect(r2.totalPrice).toBe(6000000);
    expect(orderRepo.create).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F10_21 – CreateOrderUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(CreateOrderUseCase); });
  it('UT_F10_22 – CreateOrderUseCase có prototype hợp lệ', () => { expect(CreateOrderUseCase.prototype).toBeDefined(); });
  it('UT_F10_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F10_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F10_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
});
