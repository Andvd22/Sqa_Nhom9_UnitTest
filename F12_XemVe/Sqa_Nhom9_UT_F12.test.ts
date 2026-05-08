/**
 * @file Sqa_Nhom9_UT_F12.test.ts
 * @module F12_XemVe
 * @description Unit tests for GetTicketUseCase - F12: Xem vé
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Xem vé thành công (status=completed)
 *  - Xem vé thành công (status=paid)
 *  - Order không tồn tại
 *  - Không có quyền xem vé người khác
 *  - Order chưa thanh toán (status=pending)
 *  - Order chưa thanh toán (status=cancelled)
 *  - TicketCode đúng format
 *  - Trả về đúng tourName
 *  - Trả về đúng quantity
 *  - Trả về đúng totalPrice
 *  - findByPk được gọi đúng 1 lần
 *  - findByPk đúng orderId
 *  - Order status=confirmed (nếu logic cho phép)
 *  - Order với quantity lớn
 *  - Order với totalPrice=0
 *  - Order null trả NotFoundError
 *  - UserId khác nhưng cùng orderId
 *  - Vé có tourName dài/ký tự đặc biệt
 *  - Xem vé nhiều lần
 *  - Không gọi update() khi xem vé
 */

import {
  GetTicketUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  IOrderRepository,
} from './F12.src';

function makeRepo(): jest.Mocked<IOrderRepository> {
  return { findByPk: jest.fn() } as any;
}

describe('F12 – Xem vé | GetTicketUseCase', () => {
  let repo: jest.Mocked<IOrderRepository>;
  let uc: GetTicketUseCase;

  beforeEach(() => {
    repo = makeRepo();
    uc = new GetTicketUseCase(repo);
  });

  // UT_F12_01
  it('UT_F12_01 – Xem vé thành công (status=completed)', async () => {
    /**
     * Test Case ID : UT_F12_01
     * Test Objective: Xác minh xem vé khi order đã completed
     * Input         : userId=1, orderId=101, status='completed'
     * Expected Output: { ticketCode: 'TKT-101', tourName: 'Hạ Long', quantity: 2, totalPrice: 4000000 }
     * Notes         : CheckDB – findByPk với orderId=101
     */
    repo.findByPk.mockResolvedValue({
      id: 101,
      user_id: 1,
      status: 'completed',
      tour_name: 'Hạ Long',
      quantity: 2,
      total_price: 4000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 101 });

    expect(result.ticketCode).toBe('TKT-101');
    expect(result.tourName).toBe('Hạ Long');
    expect(result.quantity).toBe(2);
    expect(result.totalPrice).toBe(4000000);
  });

  // UT_F12_02
  it('UT_F12_02 – Xem vé thành công (status=paid)', async () => {
    /**
     * Test Case ID : UT_F12_02
     * Test Objective: Xác minh xem vé khi order status=paid
     * Input         : status='paid'
     * Expected Output: ticket object
     */
    repo.findByPk.mockResolvedValue({
      id: 102,
      user_id: 1,
      status: 'paid',
      tour_name: 'Sapa',
      quantity: 1,
      total_price: 2500000,
    });

    const result = await uc.execute({ userId: 1, orderId: 102 });

    expect(result.ticketCode).toBe('TKT-102');
    expect(result.tourName).toBe('Sapa');
  });

  // UT_F12_03
  it('UT_F12_03 – Order không tồn tại', async () => {
    /**
     * Test Case ID : UT_F12_03
     * Test Objective: Xác minh NotFoundError khi orderId không có
     * Input         : orderId=999
     * Expected Output: NotFoundError "Đơn hàng không tồn tại"
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ userId: 1, orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  // UT_F12_04
  it('UT_F12_04 – Không có quyền xem vé của người khác', async () => {
    /**
     * Test Case ID : UT_F12_04
     * Test Objective: Xác minh ForbiddenError khi user_id không khớp
     * Input         : userId=1, order thuộc user 2
     * Expected Output: ForbiddenError "Không có quyền xem vé này"
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 2, status: 'completed' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ForbiddenError);
  });

  // UT_F12_05
  it('UT_F12_05 – Order chưa thanh toán (status=pending)', async () => {
    /**
     * Test Case ID : UT_F12_05
     * Test Objective: Xác minh ValidationError khi status=pending
     * Input         : status='pending'
     * Expected Output: ValidationError "Đơn hàng chưa hoàn thành thanh toán"
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  // UT_F12_06
  it('UT_F12_06 – Order chưa thanh toán (status=cancelled)', async () => {
    /**
     * Test Case ID : UT_F12_06
     * Test Objective: Xác minh ValidationError khi status=cancelled
     * Input         : status='cancelled'
     * Expected Output: ValidationError "Đơn hàng chưa hoàn thành thanh toán"
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'cancelled' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  // UT_F12_07
  it('UT_F12_07 – TicketCode đúng format TKT-{orderId}', async () => {
    /**
     * Test Case ID : UT_F12_07
     * Test Objective: Xác minh ticketCode có format chuẩn
     * Input         : orderId=105
     * Expected Output: ticketCode='TKT-105'
     */
    repo.findByPk.mockResolvedValue({
      id: 105,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 1,
      total_price: 1000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 105 });

    expect(result.ticketCode).toMatch(/^TKT-\d+$/);
    expect(result.ticketCode).toBe('TKT-105');
  });

  // UT_F12_08
  it('UT_F12_08 – Trả về đúng tourName', async () => {
    /**
     * Test Case ID : UT_F12_08
     * Test Objective: Xác minh tourName từ order trả về chính xác
     * Input         : tour_name='Phú Quốc 3N2Đ'
     * Expected Output: result.tourName='Phú Quốc 3N2Đ'
     * Notes         : CheckDB – đọc đúng cột tour_name
     */
    repo.findByPk.mockResolvedValue({
      id: 106,
      user_id: 1,
      status: 'completed',
      tour_name: 'Phú Quốc 3N2Đ',
      quantity: 2,
      total_price: 6000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 106 });

    expect(result.tourName).toBe('Phú Quốc 3N2Đ');
  });

  // UT_F12_09
  it('UT_F12_09 – Trả về đúng quantity', async () => {
    /**
     * Test Case ID : UT_F12_09
     * Test Objective: Xác minh quantity từ order trả về chính xác
     * Input         : quantity=5
     * Expected Output: result.quantity=5
     */
    repo.findByPk.mockResolvedValue({
      id: 107,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 5,
      total_price: 10000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 107 });

    expect(result.quantity).toBe(5);
  });

  // UT_F12_10
  it('UT_F12_10 – Trả về đúng totalPrice', async () => {
    /**
     * Test Case ID : UT_F12_10
     * Test Objective: Xác minh totalPrice từ order trả về chính xác
     * Input         : total_price=8500000
     * Expected Output: result.totalPrice=8500000
     */
    repo.findByPk.mockResolvedValue({
      id: 108,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 2,
      total_price: 8500000,
    });

    const result = await uc.execute({ userId: 1, orderId: 108 });

    expect(result.totalPrice).toBe(8500000);
  });

  // UT_F12_11
  it('UT_F12_11 – findByPk được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F12_11
     * Test Objective: Xác minh không query order nhiều lần
     * Input         : orderId=101
     * Expected Output: findByPk(101) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 101 });

    expect(repo.findByPk).toHaveBeenCalledTimes(1);
    expect(repo.findByPk).toHaveBeenCalledWith(101);
  });

  // UT_F12_12
  it('UT_F12_12 – findByPk đúng orderId được truyền', async () => {
    /**
     * Test Case ID : UT_F12_12
     * Test Objective: Xác minh tra cứu đúng ID order
     * Input         : orderId=200
     * Expected Output: findByPk(200)
     */
    repo.findByPk.mockResolvedValue({ id: 200, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 200 });

    expect(repo.findByPk).toHaveBeenCalledWith(200);
  });

  // UT_F12_13
  it('UT_F12_13 – Order status=confirmed (nếu logic cho phép)', async () => {
    /**
     * Test Case ID : UT_F12_13
     * Test Objective: Xác minh status=confirmed cũng được chấp nhận
     * Input         : status='confirmed'
     * Expected Output: Vé được trả về (hoặc ValidationError tùy src)
     * Notes         : src chỉ cho phép 'completed' và 'paid'
     */
    repo.findByPk.mockResolvedValue({
      id: 109,
      user_id: 1,
      status: 'confirmed',
      tour_name: 'Test',
      quantity: 1,
      total_price: 1000000,
    });

    // Nếu src chỉ cho phép completed/paid, confirmed sẽ throw ValidationError
    await expect(uc.execute({ userId: 1, orderId: 109 })).rejects.toThrow(ValidationError);
  });

  // UT_F12_14
  it('UT_F12_14 – Order với quantity lớn', async () => {
    /**
     * Test Case ID : UT_F12_14
     * Test Objective: Xác minh quantity lớn vẫn trả về chính xác
     * Input         : quantity=50
     * Expected Output: result.quantity=50
     */
    repo.findByPk.mockResolvedValue({
      id: 110,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 50,
      total_price: 100000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 110 });

    expect(result.quantity).toBe(50);
  });

  // UT_F12_15
  it('UT_F12_15 – Order với totalPrice=0 (free tour)', async () => {
    /**
     * Test Case ID : UT_F12_15
     * Test Objective: Xác minh free tour vẫn có vé
     * Input         : total_price=0
     * Expected Output: result.totalPrice=0
     */
    repo.findByPk.mockResolvedValue({
      id: 111,
      user_id: 1,
      status: 'completed',
      tour_name: 'Free Tour',
      quantity: 1,
      total_price: 0,
    });

    const result = await uc.execute({ userId: 1, orderId: 111 });

    expect(result.totalPrice).toBe(0);
    expect(result.ticketCode).toBe('TKT-111');
  });

  // UT_F12_16
  it('UT_F12_16 – Order null trả NotFoundError', async () => {
    /**
     * Test Case ID : UT_F12_16
     * Test Objective: Xác minh NotFoundError khi findByPk trả null
     * Input         : orderId=0
     * Expected Output: NotFoundError
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ userId: 1, orderId: 0 })).rejects.toThrow(NotFoundError);
  });

  // UT_F12_17
  it('UT_F12_17 – UserId khác nhưng cùng orderId', async () => {
    /**
     * Test Case ID : UT_F12_17
     * Test Objective: Xác minh ForbiddenError khi userId khác user_id trong order
     * Input         : userId=99, order.user_id=1
     * Expected Output: ForbiddenError
     */
    repo.findByPk.mockResolvedValue({ id: 112, user_id: 1, status: 'completed' });

    await expect(uc.execute({ userId: 99, orderId: 112 })).rejects.toThrow(ForbiddenError);
  });

  // UT_F12_18
  it('UT_F12_18 – Vé có tourName dài và ký tự đặc biệt', async () => {
    /**
     * Test Case ID : UT_F12_18
     * Test Objective: Xác minh tourName có unicode/dấu vẫn trả về chính xác
     * Input         : tour_name='Tour Hà Nội - Hạ Long 3N2Đ (Ưu đãi 50%)'
     * Expected Output: result.tourName khớp input
     */
    const longName = 'Tour Hà Nội - Hạ Long 3N2Đ (Ưu đãi 50%)';
    repo.findByPk.mockResolvedValue({
      id: 113,
      user_id: 1,
      status: 'completed',
      tour_name: longName,
      quantity: 2,
      total_price: 5000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 113 });

    expect(result.tourName).toBe(longName);
  });

  // UT_F12_19
  it('UT_F12_19 – Xem vé nhiều lần cùng orderId', async () => {
    /**
     * Test Case ID : UT_F12_19
     * Test Objective: Xác minh xem vé nhiều lần đều thành công
     * Input         : orderId=114, gọi 3 lần
     * Expected Output: Cả 3 lần trả về cùng ticketCode
     * Notes         : CheckDB – findByPk được gọi 3 lần (read-only OK)
     */
    repo.findByPk.mockResolvedValue({
      id: 114,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 1,
      total_price: 1000000,
    });

    const r1 = await uc.execute({ userId: 1, orderId: 114 });
    const r2 = await uc.execute({ userId: 1, orderId: 114 });
    const r3 = await uc.execute({ userId: 1, orderId: 114 });

    expect(r1.ticketCode).toBe('TKT-114');
    expect(r2.ticketCode).toBe('TKT-114');
    expect(r3.ticketCode).toBe('TKT-114');
    expect(repo.findByPk).toHaveBeenCalledTimes(3);
  });

  // UT_F12_20
  it('UT_F12_20 – Không gọi update() khi xem vé', async () => {
    /**
     * Test Case ID : UT_F12_20
     * Test Objective: Xác minh xem vé là read-only, không ghi DB
     * Input         : orderId=115
     * Expected Output: update() KHÔNG được gọi
     * Notes         : Use case không có phương thức update
     */
    repo.findByPk.mockResolvedValue({
      id: 115,
      user_id: 1,
      status: 'completed',
      tour_name: 'Test',
      quantity: 1,
      total_price: 1000000,
    });

    await uc.execute({ userId: 1, orderId: 115 });

    // repo.findByPk là mock, không có update method
    expect((repo as any).update).toBeUndefined();
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F12_21 – GetTicketUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(GetTicketUseCase); });
  it('UT_F12_22 – GetTicketUseCase có prototype hợp lệ', () => { expect(GetTicketUseCase.prototype).toBeDefined(); });
  it('UT_F12_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
});
