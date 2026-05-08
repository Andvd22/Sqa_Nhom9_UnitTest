/**
 * @file Sqa_Nhom9_UT_F09.test.ts
 * @module F09_XemVaQuanLyDonHangDaDat
 * @description Unit tests for GetUserOrdersUseCase - F09: Xem và quản lý đơn hàng đã đặt
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Lấy danh sách đơn hàng thành công
 *  - Phân trang mặc định
 *  - Phân trang custom
 *  - Danh sách rỗng
 *  - Lấy chi tiết đơn hàng
 *  - Order không tồn tại
 *  - Không có quyền xem đơn hàng người khác
 *  - Tính totalPages đúng
 *  - Sắp xếp created_at DESC
 *  - Order có nhiều tour
 *  - Order pending
 *  - Order confirmed
 *  - Order cancelled
 *  - findAndCountAll where user_id đúng
 *  - findOne đúng 1 lần (detail)
 *  - getOrderDetail không gọi findAndCountAll
 *  - OrderId không hợp lệ
 *  - Page=0 chuyển thành 1
 *  - Limit=0 chuyển thành 10
 *  - Nhiều orders mixed status
 */

import {
  GetUserOrdersUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  IOrderRepository,
} from './F09.src';

function makeRepo(): jest.Mocked<IOrderRepository> {
  return {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  } as any;
}

describe('F09 – Xem và quản lý đơn hàng đã đặt | GetUserOrdersUseCase', () => {
  let repo: jest.Mocked<IOrderRepository>;
  let uc: GetUserOrdersUseCase;

  beforeEach(() => {
    repo = makeRepo();
    uc = new GetUserOrdersUseCase(repo);
  });

  // UT_F09_01
  it('UT_F09_01 – Lấy danh sách đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F09_01
     * Test Objective: Xác minh lấy danh sách đơn hàng của user
     * Input         : userId=1, page=1, limit=10
     * Expected Output: { orders: [order1, order2], pagination: {...} }
     * Notes         : CheckDB – findAndCountAll được gọi với where user_id=1
     */
    const rows = [
      { id: 101, total_amount: 5000000, status: 'pending' },
      { id: 102, total_amount: 3200000, status: 'confirmed' },
    ];
    repo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.execute({ userId: 1, page: 1, limit: 10 });

    expect(result.orders).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 1 } })
    );
  });

  // UT_F09_02
  it('UT_F09_02 – Phân trang mặc định page=1 limit=10', async () => {
    /**
     * Test Case ID : UT_F09_02
     * Test Objective: Xác minh giá trị mặc định khi không truyền page/limit
     * Input         : userId=1 (không truyền page, limit)
     * Expected Output: limit=10, offset=0
     * Notes         : Default page=1, limit=10
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.execute({ userId: 1 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  // UT_F09_03
  it('UT_F09_03 – Phân trang custom page=2 limit=5', async () => {
    /**
     * Test Case ID : UT_F09_03
     * Test Objective: Xác minh offset đúng với page=2 limit=5
     * Input         : page=2, limit=5
     * Expected Output: offset=5
     */
    repo.findAndCountAll.mockResolvedValue({ count: 12, rows: [] });

    await uc.execute({ userId: 1, page: 2, limit: 5 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 5 })
    );
  });

  // UT_F09_04
  it('UT_F09_04 – Danh sách đơn hàng rỗng', async () => {
    /**
     * Test Case ID : UT_F09_04
     * Test Objective: Xác minh trả về rỗng khi user chưa có đơn
     * Input         : userId=2
     * Expected Output: { orders: [], pagination: { total: 0, totalPages: 0 } }
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.execute({ userId: 2 });

    expect(result.orders).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  // UT_F09_05
  it('UT_F09_05 – Lấy chi tiết đơn hàng thành công', async () => {
    /**
     * Test Case ID : UT_F09_05
     * Test Objective: Xác minh lấy chi tiết 1 đơn hàng
     * Input         : userId=1, orderId=101
     * Expected Output: order object với user_id=1
     * Notes         : CheckDB – findOne được gọi với where id=101
     */
    repo.findOne.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(result.id).toBe(101);
    expect(result.user_id).toBe(1);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 101 } });
  });

  // UT_F09_06
  it('UT_F09_06 – Order không tồn tại', async () => {
    /**
     * Test Case ID : UT_F09_06
     * Test Objective: Xác minh NotFoundError khi orderId không có
     * Input         : userId=1, orderId=999
     * Expected Output: NotFoundError "Đơn hàng không tồn tại"
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.getOrderDetail({ userId: 1, orderId: 999 })
    ).rejects.toThrow(NotFoundError);
  });

  // UT_F09_07
  it('UT_F09_07 – Không có quyền xem đơn hàng của người khác', async () => {
    /**
     * Test Case ID : UT_F09_07
     * Test Objective: Xác minh ForbiddenError khi user_id không khớp
     * Input         : userId=1, order thuộc user 2
     * Expected Output: ForbiddenError "Không có quyền xem đơn hàng này"
     */
    repo.findOne.mockResolvedValue({ id: 101, user_id: 2 });

    await expect(
      uc.getOrderDetail({ userId: 1, orderId: 101 })
    ).rejects.toThrow(ForbiddenError);
  });

  // UT_F09_08
  it('UT_F09_08 – Tính totalPages đúng khi có 25 đơn limit=10', async () => {
    /**
     * Test Case ID : UT_F09_08
     * Test Objective: Xác minh totalPages = Math.ceil(count/limit)
     * Input         : count=25, limit=10
     * Expected Output: totalPages=3
     */
    repo.findAndCountAll.mockResolvedValue({ count: 25, rows: [] });

    const result = await uc.execute({ userId: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(3);
  });

  // UT_F09_09
  it('UT_F09_09 – Sắp xếp theo created_at DESC', async () => {
    /**
     * Test Case ID : UT_F09_09
     * Test Objective: Xác minh order [['created_at','DESC']]
     * Input         : userId=1
     * Expected Output: order chứa created_at DESC
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.execute({ userId: 1 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['created_at', 'DESC']],
      })
    );
  });

  // UT_F09_10
  it('UT_F09_10 – Order có nhiều tour', async () => {
    /**
     * Test Case ID : UT_F09_10
     * Test Objective: Xác minh order bao gồm nhiều tour items
     * Input         : orderId=101
     * Expected Output: order.order_items.length > 1
     */
    repo.findOne.mockResolvedValue({
      id: 101,
      user_id: 1,
      order_items: [
        { tour_id: 1, quantity: 2 },
        { tour_id: 2, quantity: 1 },
      ],
    });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(result.order_items).toHaveLength(2);
  });

  // UT_F09_11
  it('UT_F09_11 – Order có trạng thái pending', async () => {
    /**
     * Test Case ID : UT_F09_11
     * Test Objective: Xác minh lấy order có status=pending
     * Input         : orderId=101
     * Expected Output: status='pending'
     */
    repo.findOne.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(result.status).toBe('pending');
  });

  // UT_F09_12
  it('UT_F09_12 – Order có trạng thái confirmed', async () => {
    /**
     * Test Case ID : UT_F09_12
     * Test Objective: Xác minh lấy order có status=confirmed
     * Input         : orderId=102
     * Expected Output: status='confirmed'
     */
    repo.findOne.mockResolvedValue({ id: 102, user_id: 1, status: 'confirmed' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 102 });

    expect(result.status).toBe('confirmed');
  });

  // UT_F09_13
  it('UT_F09_13 – Order có trạng thái cancelled', async () => {
    /**
     * Test Case ID : UT_F09_13
     * Test Objective: Xác minh lấy order có status=cancelled
     * Input         : orderId=103
     * Expected Output: status='cancelled'
     */
    repo.findOne.mockResolvedValue({ id: 103, user_id: 1, status: 'cancelled' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 103 });

    expect(result.status).toBe('cancelled');
  });

  // UT_F09_14
  it('UT_F09_14 – findAndCountAll được gọi đúng where user_id', async () => {
    /**
     * Test Case ID : UT_F09_14
     * Test Objective: Xác minh findAndCountAll filter đúng user
     * Input         : userId=42
     * Expected Output: where.user_id=42
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.execute({ userId: 42 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 42 } })
    );
  });

  // UT_F09_15
  it('UT_F09_15 – findOne được gọi đúng 1 lần (getOrderDetail)', async () => {
    /**
     * Test Case ID : UT_F09_15
     * Test Objective: Xác minh không gọi dư query khi lấy detail
     * Input         : orderId=101
     * Expected Output: findOne đúng 1 lần
     */
    repo.findOne.mockResolvedValue({ id: 101, user_id: 1 });

    await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  // UT_F09_16
  it('UT_F09_16 – getOrderDetail không gọi findAndCountAll', async () => {
    /**
     * Test Case ID : UT_F09_16
     * Test Objective: Xác minh getOrderDetail chỉ dùng findOne
     * Input         : userId=1, orderId=101
     * Expected Output: findAndCountAll KHÔNG được gọi
     */
    repo.findOne.mockResolvedValue({ id: 101, user_id: 1 });

    await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(repo.findAndCountAll).not.toHaveBeenCalled();
  });

  // UT_F09_17
  it('UT_F09_17 – OrderId không hợp lệ (NaN) vẫn truyền xuống', async () => {
    /**
     * Test Case ID : UT_F09_17
     * Test Objective: Xác minh findOne được gọi dù orderId là NaN
     * Input         : orderId=NaN
     * Expected Output: findOne với where id=NaN trả null → NotFoundError
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.getOrderDetail({ userId: 1, orderId: NaN })
    ).rejects.toThrow(NotFoundError);
  });

  // UT_F09_18
  it('UT_F09_18 – Page=0 được chuyển thành 1 (default)', async () => {
    /**
     * Test Case ID : UT_F09_18
     * Test Objective: Xác minh page=0 → default page=1
     * Input         : page=0
     * Expected Output: offset=0 (do page=1)
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.execute({ userId: 1, page: 0 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 })
    );
  });

  // UT_F09_19
  it('UT_F09_19 – Limit=0 được chuyển thành 10 (default)', async () => {
    /**
     * Test Case ID : UT_F09_19
     * Test Objective: Xác minh limit=0 → default limit=10
     * Input         : limit=0
     * Expected Output: limit=10
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.execute({ userId: 1, limit: 0 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  // UT_F09_20
  it('UT_F09_20 – Nhiều orders với mixed status trong danh sách', async () => {
    /**
     * Test Case ID : UT_F09_20
     * Test Objective: Xác minh danh sách trả về mixed status
     * Input         : userId=1
     * Expected Output: Có pending, confirmed, cancelled trong kết quả
     * Notes         : CheckDB – findAndCountAll trả tất cả đơn của user
     */
    const rows = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'confirmed' },
      { id: 3, status: 'cancelled' },
    ];
    repo.findAndCountAll.mockResolvedValue({ count: 3, rows });

    const result = await uc.execute({ userId: 1 });

    const statuses = result.orders.map((o: any) => o.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('cancelled');
    expect(result.orders).toHaveLength(3);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F09_21 – GetUserOrdersUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(GetUserOrdersUseCase); });
  it('UT_F09_22 – GetUserOrdersUseCase có prototype hợp lệ', () => { expect(GetUserOrdersUseCase.prototype).toBeDefined(); });
  it('UT_F09_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F09_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F09_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F09_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
});
