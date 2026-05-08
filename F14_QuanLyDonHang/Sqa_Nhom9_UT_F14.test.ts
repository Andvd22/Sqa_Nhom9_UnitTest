/**
 * @file Sqa_Nhom9_UT_F14.test.ts
 * @module F14_QuanLyDonHang
 * @description Unit tests for AdminOrderManagementUseCase - F14: Quản lý đơn hàng
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Admin tạo đơn hàng thành công
 *  - Tour không tồn tại (create)
 *  - Số lượng <= 0
 *  - Vượt quá sức chứa
 *  - Ngày khởi hành quá gần
 *  - Hủy đơn hàng thành công
 *  - Hủy đơn đã hủy
 *  - Hủy đơn đã hoàn thành
 *  - Xác nhận đơn hàng
 *  - Xác nhận đơn không phải pending
 *  - Hoàn thành đơn hàng
 *  - Lấy chi tiết đơn hàng
 *  - Lấy danh sách đơn hàng
 *  - Áp dụng coupon percent
 *  - Áp dụng coupon fixed
 *  - Coupon không tồn tại
 *  - Coupon hết hạn
 *  - findByPk order đúng 1 lần (cancel)
 *  - update() được gọi đúng 1 lần (confirm)
 *  - Phân trang với status filter
 */

import {
  AdminOrderManagementUseCase,
  ValidationError,
  NotFoundError,
  IOrderRepository,
  ITourRepository,
  ICouponRepository,
} from './F14.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
  } as any;
}
function makeTourRepo(): jest.Mocked<ITourRepository> {
  return { findByPk: jest.fn() } as any;
}
function makeCouponRepo(): jest.Mocked<ICouponRepository> {
  return { findOne: jest.fn() } as any;
}

describe('F14 – Quản lý đơn hàng | AdminOrderManagementUseCase', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let tourRepo: jest.Mocked<ITourRepository>;
  let couponRepo: jest.Mocked<ICouponRepository>;
  let uc: AdminOrderManagementUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    tourRepo = makeTourRepo();
    couponRepo = makeCouponRepo();
    uc = new AdminOrderManagementUseCase(orderRepo, tourRepo, couponRepo);
  });

  // UT_F14_01
  it('UT_F14_01 – Admin tạo đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F14_01
     * Test Objective: Xác minh admin tạo đơn hàng cơ bản
     * Input         : tourId=10, quantity=2, startDate=Date+5
     * Expected Output: { orderId: 100, total: price*qty }
     * Notes         : CheckDB – create() được gọi với status='pending'
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.createOrder({ tourId: 10, quantity: 2, startDate: future });

    expect(result.orderId).toBe(100);
    expect(result.total).toBe(4000000);
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', total_price: 4000000 })
    );
  });

  // UT_F14_02
  it('UT_F14_02 – Tour không tồn tại (create)', async () => {
    /**
     * Test Case ID : UT_F14_02
     * Test Objective: Xác minh NotFoundError khi tourId không có
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue(null);

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.createOrder({ tourId: 999, quantity: 2, startDate: future })
    ).rejects.toThrow(NotFoundError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_03
  it('UT_F14_03 – Số lượng <= 0', async () => {
    /**
     * Test Case ID : UT_F14_03
     * Test Objective: Xác minh ValidationError khi quantity=0
     * Input         : quantity=0
     * Expected Output: ValidationError "Số lượng phải > 0"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.createOrder({ tourId: 10, quantity: 0, startDate: future })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_04
  it('UT_F14_04 – Vượt quá sức chứa', async () => {
    /**
     * Test Case ID : UT_F14_04
     * Test Objective: Xác minh ValidationError khi quantity > capacity
     * Input         : quantity=31, capacity=30
     * Expected Output: ValidationError "Vượt quá sức chứa"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.createOrder({ tourId: 10, quantity: 31, startDate: future })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_05
  it('UT_F14_05 – Ngày khởi hành quá gần (< 2 ngày)', async () => {
    /**
     * Test Case ID : UT_F14_05
     * Test Objective: Xác minh ValidationError khi startDate < today+2
     * Input         : startDate=Date+1
     * Expected Output: ValidationError "Phải đặt trước ít nhất 2 ngày"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await expect(
      uc.createOrder({ tourId: 10, quantity: 2, startDate: tomorrow })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_06
  it('UT_F14_06 – Hủy đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F14_06
     * Test Objective: Xác minh admin hủy đơn pending thành công
     * Input         : orderId=101, status='pending'
     * Expected Output: { message: 'Hủy đơn thành công' }
     * Notes         : CheckDB – update() với status='cancelled'
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, status: 'pending' });
    orderRepo.update.mockResolvedValue([1]);

    const result = await uc.cancelOrder({ orderId: 101 });

    expect(result.message).toBe('Hủy đơn thành công');
    expect(orderRepo.update).toHaveBeenCalledWith(
      { status: 'cancelled' },
      { where: { id: 101 } }
    );
  });

  // UT_F14_07
  it('UT_F14_07 – Hủy đơn đã hủy', async () => {
    /**
     * Test Case ID : UT_F14_07
     * Test Objective: Xác minh ValidationError khi status=cancelled
     * Input         : status='cancelled'
     * Expected Output: ValidationError "Đơn đã hủy"
     * Notes         : Không update
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, status: 'cancelled' });

    await expect(uc.cancelOrder({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  // UT_F14_08
  it('UT_F14_08 – Hủy đơn đã hoàn thành', async () => {
    /**
     * Test Case ID : UT_F14_08
     * Test Objective: Xác minh ValidationError khi status=completed
     * Input         : status='completed'
     * Expected Output: ValidationError "Đơn đã hoàn thành"
     * Notes         : Không update
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, status: 'completed' });

    await expect(uc.cancelOrder({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  // UT_F14_09
  it('UT_F14_09 – Xác nhận đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F14_09
     * Test Objective: Xác minh xác nhận đơn pending thành confirmed
     * Input         : orderId=102, status='pending'
     * Expected Output: { message: 'Xác nhận đơn thành công' }
     * Notes         : CheckDB – update() với status='confirmed'
     */
    orderRepo.findByPk.mockResolvedValue({ id: 102, status: 'pending' });
    orderRepo.update.mockResolvedValue([1]);

    const result = await uc.confirmOrder({ orderId: 102 });

    expect(result.message).toBe('Xác nhận đơn thành công');
    expect(orderRepo.update).toHaveBeenCalledWith(
      { status: 'confirmed' },
      { where: { id: 102 } }
    );
  });

  // UT_F14_10
  it('UT_F14_10 – Xác nhận đơn không phải pending', async () => {
    /**
     * Test Case ID : UT_F14_10
     * Test Objective: Xác minh ValidationError khi confirm non-pending
     * Input         : status='confirmed'
     * Expected Output: ValidationError "Chỉ xác nhận đơn pending"
     * Notes         : Không update
     */
    orderRepo.findByPk.mockResolvedValue({ id: 102, status: 'confirmed' });

    await expect(uc.confirmOrder({ orderId: 102 })).rejects.toThrow(ValidationError);

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  // UT_F14_11
  it('UT_F14_11 – Hoàn thành đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F14_11
     * Test Objective: Xác minh hoàn thành đơn hàng
     * Input         : orderId=103
     * Expected Output: { message: 'Hoàn thành đơn' }
     * Notes         : CheckDB – update() với status='completed'
     */
    orderRepo.findByPk.mockResolvedValue({ id: 103, status: 'confirmed' });
    orderRepo.update.mockResolvedValue([1]);

    const result = await uc.completeOrder({ orderId: 103 });

    expect(result.message).toBe('Hoàn thành đơn');
    expect(orderRepo.update).toHaveBeenCalledWith(
      { status: 'completed' },
      { where: { id: 103 } }
    );
  });

  // UT_F14_12
  it('UT_F14_12 – Lấy chi tiết đơn hàng', async () => {
    /**
     * Test Case ID : UT_F14_12
     * Test Objective: Xác minh lấy chi tiết 1 đơn hàng
     * Input         : orderId=104
     * Expected Output: order object
     * Notes         : CheckDB – findByPk(104)
     */
    orderRepo.findByPk.mockResolvedValue({ id: 104, status: 'pending' });

    const result = await uc.getOrderDetail({ orderId: 104 });

    expect(result.id).toBe(104);
    expect(orderRepo.findByPk).toHaveBeenCalledWith(104);
  });

  // UT_F14_13
  it('UT_F14_13 – Lấy danh sách đơn hàng phân trang', async () => {
    /**
     * Test Case ID : UT_F14_13
     * Test Objective: Xác minh lấy danh sách đơn hàng admin
     * Input         : page=1, limit=10
     * Expected Output: { orders: [...], pagination: {...} }
     * Notes         : CheckDB – findAndCountAll được gọi
     */
    const rows = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'confirmed' },
    ];
    orderRepo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.getOrders({ page: 1, limit: 10 });

    expect(result.orders).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  // UT_F14_14
  it('UT_F14_14 – Áp dụng coupon percent', async () => {
    /**
     * Test Case ID : UT_F14_14
     * Test Objective: Xác minh giảm giá theo phần trăm
     * Input         : price=1000000, quantity=2, couponCode='SUMMER10', discount_amount=10
     * Expected Output: total = 2000000 - 10% = 1800000
     * Notes         : CheckDB – couponRepo.findOne được gọi
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 1000000, capacity: 30 });
    couponRepo.findOne.mockResolvedValue({
      code: 'SUMMER10',
      discount_type: 'percent',
      discount_amount: 10,
      end_date: new Date(Date.now() + 86400000),
    });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.createOrder({
      tourId: 10,
      quantity: 2,
      startDate: future,
      couponCode: 'SUMMER10',
    });

    expect(result.total).toBe(1800000);
  });

  // UT_F14_15
  it('UT_F14_15 – Áp dụng coupon fixed', async () => {
    /**
     * Test Case ID : UT_F14_15
     * Test Objective: Xác minh giảm giá cố định
     * Input         : price=1000000, quantity=2, couponCode='FIXED500', discount_amount=500000
     * Expected Output: total = 2000000 - 500000 = 1500000
     * Notes         : CheckDB – couponRepo.findOne được gọi
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 1000000, capacity: 30 });
    couponRepo.findOne.mockResolvedValue({
      code: 'FIXED500',
      discount_type: 'fixed',
      discount_amount: 500000,
      end_date: new Date(Date.now() + 86400000),
    });
    orderRepo.create.mockResolvedValue({ id: 100 });

    const future = new Date(); future.setDate(future.getDate() + 5);
    const result = await uc.createOrder({
      tourId: 10,
      quantity: 2,
      startDate: future,
      couponCode: 'FIXED500',
    });

    expect(result.total).toBe(1500000);
  });

  // UT_F14_16
  it('UT_F14_16 – Coupon không tồn tại', async () => {
    /**
     * Test Case ID : UT_F14_16
     * Test Objective: Xác minh NotFoundError khi couponCode không có
     * Input         : couponCode='INVALID'
     * Expected Output: NotFoundError "Mã giảm giá không tồn tại"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    couponRepo.findOne.mockResolvedValue(null);

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.createOrder({ tourId: 10, quantity: 2, startDate: future, couponCode: 'INVALID' })
    ).rejects.toThrow(NotFoundError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_17
  it('UT_F14_17 – Coupon hết hạn', async () => {
    /**
     * Test Case ID : UT_F14_17
     * Test Objective: Xác minh ValidationError khi coupon hết hạn
     * Input         : end_date < today
     * Expected Output: ValidationError "Mã đã hết hạn"
     * Notes         : Không create
     */
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    couponRepo.findOne.mockResolvedValue({
      code: 'EXPIRED',
      discount_type: 'percent',
      discount_amount: 10,
      end_date: new Date(Date.now() - 86400000),
    });

    const future = new Date(); future.setDate(future.getDate() + 5);
    await expect(
      uc.createOrder({ tourId: 10, quantity: 2, startDate: future, couponCode: 'EXPIRED' })
    ).rejects.toThrow(ValidationError);

    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  // UT_F14_18
  it('UT_F14_18 – findByPk order đúng 1 lần (cancel)', async () => {
    /**
     * Test Case ID : UT_F14_18
     * Test Objective: Xác minh không query order nhiều lần khi hủy
     * Input         : orderId=101
     * Expected Output: findByPk(101) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, status: 'pending' });
    orderRepo.update.mockResolvedValue([1]);

    await uc.cancelOrder({ orderId: 101 });

    expect(orderRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(orderRepo.findByPk).toHaveBeenCalledWith(101);
  });

  // UT_F14_19
  it('UT_F14_19 – update() được gọi đúng 1 lần (confirm)', async () => {
    /**
     * Test Case ID : UT_F14_19
     * Test Objective: Xác minh không có vòng lặp/retry update
     * Input         : orderId=102
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    orderRepo.findByPk.mockResolvedValue({ id: 102, status: 'pending' });
    orderRepo.update.mockResolvedValue([1]);

    await uc.confirmOrder({ orderId: 102 });

    expect(orderRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F14_20
  it('UT_F14_20 – Phân trang với status filter', async () => {
    /**
     * Test Case ID : UT_F14_20
     * Test Objective: Xác minh filter theo status
     * Input         : status='pending'
     * Expected Output: where.status='pending'
     * Notes         : CheckDB – findAndCountAll với where
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 3, rows: [] });

    await uc.getOrders({ status: 'pending' });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F14_21 – AdminOrderManagementUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(AdminOrderManagementUseCase); });
  it('UT_F14_22 – AdminOrderManagementUseCase có prototype hợp lệ', () => { expect(AdminOrderManagementUseCase.prototype).toBeDefined(); });
  it('UT_F14_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F14_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F14_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F14_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
  it('UT_F14_27 – NotFoundError giữ nguyên name', () => { const err = new NotFoundError('msg'); expect(err.name).toBe('NotFoundError'); });
  it('UT_F14_28 – NotFoundError giữ nguyên message', () => { const err = new NotFoundError('sample'); expect(err.message).toBe('sample'); });
});
