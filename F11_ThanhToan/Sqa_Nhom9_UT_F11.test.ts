/**
 * @file Sqa_Nhom9_UT_F11.test.ts
 * @module F11_ThanhToan
 * @description Unit tests for PaymentUseCase - F11: Thanh toán
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Tạo link thanh toán thành công
 *  - Order không tồn tại (create)
 *  - Giá trị đơn < 10,000đ
 *  - Giá trị đơn > 50,000,000đ
 *  - Đơn hàng đã thanh toán
 *  - verifyPayment trả về isPaid=true
 *  - verifyPayment trả về isPaid=false
 *  - verifyPayment order không tồn tại
 *  - Tạo link với giá đúng 10,000đ (biên dưới)
 *  - Tạo link với giá đúng 50,000,000đ (biên trên)
 *  - Gateway được gọi với đúng amount + orderId
 *  - findByPk được gọi đúng 1 lần (createPayment)
 *  - findByPk được gọi đúng 1 lần (verifyPayment)
 *  - verifyPayment không gọi update()
 *  - Order có total_price = 0
 *  - Order có giá gần biên trên
 *  - Order is_paid=true nhưng paid_at=null
 *  - verifyPayment trả về đúng paidAt
 *  - createPayment với order cancelled
 *  - Gateway trả về URL hợp lệ
 */

import {
  PaymentUseCase,
  ValidationError,
  NotFoundError,
  IOrderRepository,
  IPaymentGateway,
} from './F11.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return {
    findByPk: jest.fn(),
    update: jest.fn(),
  } as any;
}

function makeGateway(): jest.Mocked<IPaymentGateway> {
  return {
    createPaymentLink: jest.fn(),
  } as any;
}

describe('F11 – Thanh toán | PaymentUseCase', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let gateway: jest.Mocked<IPaymentGateway>;
  let uc: PaymentUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    gateway = makeGateway();
    uc = new PaymentUseCase(orderRepo, gateway);
  });

  // UT_F11_01
  it('UT_F11_01 – Tạo link thanh toán thành công', async () => {
    /**
     * Test Case ID : UT_F11_01
     * Test Objective: Xác minh tạo link thanh toán cơ bản
     * Input         : orderId=101, total_price=5000000, is_paid=false
     * Expected Output: { paymentUrl: 'https://momo.vn/...', amount: 5000000 }
     * Notes         : CheckDB – gateway.createPaymentLink được gọi
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/abc' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.paymentUrl).toBe('https://momo.vn/pay/abc');
    expect(result.amount).toBe(5000000);
  });

  // UT_F11_02
  it('UT_F11_02 – Order không tồn tại (createPayment)', async () => {
    /**
     * Test Case ID : UT_F11_02
     * Test Objective: Xác minh NotFoundError khi orderId không có
     * Input         : orderId=999
     * Expected Output: NotFoundError "Đơn hàng không tồn tại"
     * Notes         : Không gọi gateway
     */
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.createPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);

    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  // UT_F11_03
  it('UT_F11_03 – Giá trị đơn < 10,000đ', async () => {
    /**
     * Test Case ID : UT_F11_03
     * Test Objective: Xác minh ValidationError khi total_price < 10000
     * Input         : total_price=5000
     * Expected Output: ValidationError "Giá trị đơn hàng phải từ 10,000đ"
     * Notes         : Không gọi gateway
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  // UT_F11_04
  it('UT_F11_04 – Giá trị đơn > 50,000,000đ', async () => {
    /**
     * Test Case ID : UT_F11_04
     * Test Objective: Xác minh ValidationError khi total_price > 50000000
     * Input         : total_price=60000000
     * Expected Output: ValidationError "Giá trị đơn hàng tối đa 50,000,000đ"
     * Notes         : Không gọi gateway
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 60000000, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  // UT_F11_05
  it('UT_F11_05 – Đơn hàng đã thanh toán', async () => {
    /**
     * Test Case ID : UT_F11_05
     * Test Objective: Xác minh ValidationError khi is_paid=true
     * Input         : is_paid=true
     * Expected Output: ValidationError "Đơn hàng đã thanh toán"
     * Notes         : Không gọi gateway
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: true });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  // UT_F11_06
  it('UT_F11_06 – verifyPayment trả về isPaid=true', async () => {
    /**
     * Test Case ID : UT_F11_06
     * Test Objective: Xác minh verify trả về đúng khi đã thanh toán
     * Input         : orderId=101, is_paid=true
     * Expected Output: { isPaid: true, paidAt: '2024-01-15T10:00:00Z' }
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true, paid_at: '2024-01-15T10:00:00Z' });

    const result = await uc.verifyPayment({ orderId: 101 });

    expect(result.isPaid).toBe(true);
    expect(result.paidAt).toBe('2024-01-15T10:00:00Z');
  });

  // UT_F11_07
  it('UT_F11_07 – verifyPayment trả về isPaid=false', async () => {
    /**
     * Test Case ID : UT_F11_07
     * Test Objective: Xác minh verify trả về đúng khi chưa thanh toán
     * Input         : orderId=102, is_paid=false
     * Expected Output: { isPaid: false, paidAt: null }
     */
    orderRepo.findByPk.mockResolvedValue({ id: 102, is_paid: false, paid_at: null });

    const result = await uc.verifyPayment({ orderId: 102 });

    expect(result.isPaid).toBe(false);
    expect(result.paidAt).toBeNull();
  });

  // UT_F11_08
  it('UT_F11_08 – verifyPayment order không tồn tại', async () => {
    /**
     * Test Case ID : UT_F11_08
     * Test Objective: Xác minh NotFoundError khi verify orderId không có
     * Input         : orderId=999
     * Expected Output: NotFoundError "Đơn hàng không tồn tại"
     */
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.verifyPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  // UT_F11_09
  it('UT_F11_09 – Tạo link với giá đúng 10,000đ (biên dưới)', async () => {
    /**
     * Test Case ID : UT_F11_09
     * Test Objective: Xác minh giá đúng 10,000đ được chấp nhận
     * Input         : total_price=10000
     * Expected Output: Cập nhật thành công
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 10000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/123' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(10000);
  });

  // UT_F11_10
  it('UT_F11_10 – Tạo link với giá đúng 50,000,000đ (biên trên)', async () => {
    /**
     * Test Case ID : UT_F11_10
     * Test Objective: Xác minh giá đúng 50,000,000đ được chấp nhận
     * Input         : total_price=50000000
     * Expected Output: Cập nhật thành công
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 50000000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/456' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(50000000);
  });

  // UT_F11_11
  it('UT_F11_11 – Gateway được gọi với đúng amount và orderId', async () => {
    /**
     * Test Case ID : UT_F11_11
     * Test Objective: Xác minh gateway nhận đúng tham số
     * Input         : orderId=101, total_price=8000000
     * Expected Output: createPaymentLink(8000000, 101) được gọi
     * Notes         : CheckDB – integration với Momo gateway
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 8000000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/789' });

    await uc.createPayment({ orderId: 101 });

    expect(gateway.createPaymentLink).toHaveBeenCalledWith(8000000, 101);
  });

  // UT_F11_12
  it('UT_F11_12 – findByPk được gọi đúng 1 lần (createPayment)', async () => {
    /**
     * Test Case ID : UT_F11_12
     * Test Objective: Xác minh không query order nhiều lần
     * Input         : orderId=101
     * Expected Output: findByPk(101) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/abc' });

    await uc.createPayment({ orderId: 101 });

    expect(orderRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(orderRepo.findByPk).toHaveBeenCalledWith(101);
  });

  // UT_F11_13
  it('UT_F11_13 – findByPk được gọi đúng 1 lần (verifyPayment)', async () => {
    /**
     * Test Case ID : UT_F11_13
     * Test Objective: Xác minh verifyPayment chỉ query 1 lần
     * Input         : orderId=101
     * Expected Output: findByPk(101) đúng 1 lần
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true });

    await uc.verifyPayment({ orderId: 101 });

    expect(orderRepo.findByPk).toHaveBeenCalledTimes(1);
  });

  // UT_F11_14
  it('UT_F11_14 – verifyPayment không gọi update()', async () => {
    /**
     * Test Case ID : UT_F11_14
     * Test Objective: Xác minh verifyPayment chỉ đọc không ghi
     * Input         : orderId=101
     * Expected Output: update() KHÔNG được gọi
     * Notes         : verifyPayment là read-only
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true });

    await uc.verifyPayment({ orderId: 101 });

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  // UT_F11_15
  it('UT_F11_15 – Order có total_price = 0', async () => {
    /**
     * Test Case ID : UT_F11_15
     * Test Objective: Xác minh ValidationError khi total_price=0 (< 10000)
     * Input         : total_price=0
     * Expected Output: ValidationError "Giá trị đơn hàng phải từ 10,000đ"
     * Notes         : Không gọi gateway
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 0, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);

    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  // UT_F11_16
  it('UT_F11_16 – Order có giá gần biên trên (49,999,999đ)', async () => {
    /**
     * Test Case ID : UT_F11_16
     * Test Objective: Xác minh giá 49,999,999đ được chấp nhận
     * Input         : total_price=49999999
     * Expected Output: Cập nhật thành công
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 49999999, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/xyz' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(49999999);
  });

  // UT_F11_17
  it('UT_F11_17 – Order is_paid=true nhưng paid_at=null', async () => {
    /**
     * Test Case ID : UT_F11_17
     * Test Objective: Xác minh isPaid=true dù paid_at=null (edge data)
     * Input         : is_paid=true, paid_at=null
     * Expected Output: { isPaid: true, paidAt: null }
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true, paid_at: null });

    const result = await uc.verifyPayment({ orderId: 101 });

    expect(result.isPaid).toBe(true);
    expect(result.paidAt).toBeNull();
  });

  // UT_F11_18
  it('UT_F11_18 – verifyPayment trả về đúng paidAt', async () => {
    /**
     * Test Case ID : UT_F11_18
     * Test Objective: Xác minh verifyPayment trả về timestamp thanh toán
     * Input         : paid_at='2024-06-15T14:30:00Z'
     * Expected Output: paidAt='2024-06-15T14:30:00Z'
     * Notes         : CheckDB – đọc đúng cột paid_at
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true, paid_at: '2024-06-15T14:30:00Z' });

    const result = await uc.verifyPayment({ orderId: 101 });

    expect(result.paidAt).toBe('2024-06-15T14:30:00Z');
  });

  // UT_F11_19
  it('UT_F11_19 – createPayment với order cancelled', async () => {
    /**
     * Test Case ID : UT_F11_19
     * Test Objective: Xác minh cancelled order vẫn có thể tạo link (nếu chưa paid)
     * Input         : status='cancelled', is_paid=false
     * Expected Output: Cập nhật thành công (hoặc ValidationError tùy logic)
     * Notes         : Use case không check status, chỉ check is_paid
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: false, status: 'cancelled' });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/abc' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.paymentUrl).toBe('https://momo.vn/pay/abc');
  });

  // UT_F11_20
  it('UT_F11_20 – Gateway trả về URL hợp lệ', async () => {
    /**
     * Test Case ID : UT_F11_20
     * Test Objective: Xác minh URL thanh toán không rỗng
     * Input         : orderId=101
     * Expected Output: paymentUrl bắt đầu bằng http
     * Notes         : CheckDB – gateway trả về string URL
     */
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: false });
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://payment.momo.vn/abc123' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.paymentUrl).toMatch(/^https?:\/\//);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F11_21 – PaymentUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(PaymentUseCase); });
  it('UT_F11_22 – PaymentUseCase có prototype hợp lệ', () => { expect(PaymentUseCase.prototype).toBeDefined(); });
  it('UT_F11_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F11_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
});
