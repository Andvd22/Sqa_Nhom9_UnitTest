import {
  PaymentUseCase,
  calculateClientDiscount,
  calculateClientTotal,
  ValidationError,
  NotFoundError,
  IOrderRepository,
  IPaymentGateway,
  IVoucherRepository,
} from './F11.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { findByPk: jest.fn(), update: jest.fn() } as any;
}

function makeGateway(): jest.Mocked<IPaymentGateway> {
  return { createPaymentLink: jest.fn() } as any;
}

function makeVoucherRepo(): jest.Mocked<IVoucherRepository> {
  return { findOne: jest.fn() } as any;
}

describe('F11 - Thanh toán theo PaymentPage/bookingService', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let gateway: jest.Mocked<IPaymentGateway>;
  let uc: PaymentUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    gateway = makeGateway();
    uc = new PaymentUseCase(orderRepo, gateway);
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/abc' });
  });

  it('UT_F11_01 - Xác minh tạo link thanh toán với amount bằng total hiện tại', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result).toEqual({ paymentUrl: 'https://momo.vn/pay/abc', amount: 5000000 });
    expect(gateway.createPaymentLink).toHaveBeenCalledWith(5000000, 101);
  });

  it('UT_F11_02 - Xác minh NotFoundError khi order không tồn tại', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.createPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);
    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  it('UT_F11_03 - Xác minh đơn hàng đã thanh toán bị từ chối', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: true });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_04 - Xác minh ValidationError khi giá trị dưới 10000', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_05 - Xác minh ValidationError khi giá trị trên 50000000', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 51000000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_06 - Xác minh biên dưới 10000 được chấp nhận', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 10000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(10000);
  });

  it('UT_F11_07 - Xác minh biên trên 50000000 được chấp nhận', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 50000000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(50000000);
  });

  it('UT_F11_08 - Xác minh coupon phần trăm không được vượt discount_limit', () => {
    const discount = calculateClientDiscount(7200000, {
      code: '1THANG5',
      discount_percent: 50,
      discount_limit: 15000,
      is_active: true,
    });

    expect(discount).toBe(15000);
  });

  it('UT_F11_09 - Xác minh coupon fixed trả đúng số tiền giảm', () => {
    expect(calculateClientDiscount(2000000, { discount_amount: 100000, is_active: true })).toBe(100000);
  });

  it('UT_F11_10 - Xác minh coupon inactive không giảm giá', () => {
    expect(calculateClientDiscount(2000000, { discount_percent: 50, is_active: false })).toBe(0);
  });

  it('UT_F11_11 - Xác minh tổng tiền client bằng subtotal trừ discount', () => {
    expect(calculateClientTotal(1800000, 4, 3600000)).toBe(3600000);
  });

  it('UT_F11_12 - Xác minh storedDiscount được giữ nguyên nếu không tính lại bằng voucherCode', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 4, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 1, storedDiscount: 3600000 });

    expect(summary.subtotal).toBe(1800000);
    expect(summary.discount).toBe(3600000);
    expect(summary.total).toBe(0);
  });

  it('UT_F11_13 - Xác minh khi apply coupon lại thì discount tính theo quantity hiện tại', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 4, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: '1THANG5', discount_percent: 50, discount_limit: 15000, is_active: true });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 1, voucherCode: '1THANG5' });

    expect(summary.discount).toBe(15000);
    expect(summary.total).toBe(1785000);
  });

  it('UT_F11_14 - Xác minh amount gửi sang gateway bằng tổng tiền sau giảm', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: 'SALE50', discount_percent: 50, is_active: true });

    const result = await uc.createPayment({ orderId: 101, quantity: 2, voucherCode: 'SALE50' });

    expect(gateway.createPaymentLink).toHaveBeenCalledWith(1800000, 101);
    expect(result.amount).toBe(1800000);
  });

  it('UT_F11_15 - Xác minh verifyPayment trả isPaid và paidAt', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true, paid_at: '2024-06-15T10:00:00Z' });

    const result = await uc.verifyPayment({ orderId: 101 });

    expect(result).toEqual({ isPaid: true, paidAt: '2024-06-15T10:00:00Z' });
  });

  it('UT_F11_16 - Xác minh verifyPayment không ghi DB', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: false, paid_at: null });

    await uc.verifyPayment({ orderId: 101 });

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  it('UT_F11_17 - Xác minh đơn cancelled vẫn tạo link thanh toán theo source hiện tại', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false, status: 'cancelled' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(5000000);
  });

  it('UT_F11_18 - Xác minh ValidationError khi quantity không phải số nguyên', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });

    await expect(uc.calculateSummary({ orderId: 101, quantity: 1.5 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_19 - Xác minh NotFoundError khi verifyPayment với order không tồn tại', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.verifyPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F11_20 - Xác minh mã lỗi ValidationError và NotFoundError đúng', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F11_21 - Xác minh ValidationError khi quantity bằng 0', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });

    await expect(uc.calculateSummary({ orderId: 101, quantity: 0 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_22 - Xác minh khi không có unit_price thì lấy giá từ tour.price', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, tour: { price: 2500000 }, quantity: 2, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 2 });

    expect(summary.subtotal).toBe(5000000);
    expect(summary.unitPrice).toBe(2500000);
  });

  it('UT_F11_23 - Xác minh khi không có unit_price và tour.price thì suy ra từ total_price chia quantity', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 6000000, quantity: 3, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101 });

    expect(summary.unitPrice).toBe(2000000);
    expect(summary.subtotal).toBe(6000000);
  });

  it('UT_F11_24 - Xác minh coupon không tồn tại thì discount bằng 0', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 1, is_paid: false });
    voucherRepo.findOne.mockResolvedValue(null);

    const summary = await uc.calculateSummary({ orderId: 101, voucherCode: 'NOTFOUND' });

    expect(summary.discount).toBe(0);
    expect(summary.total).toBe(1800000);
  });

  it('UT_F11_25 - Xác minh fixed discount lớn hơn subtotal làm total về 0', () => {
    expect(calculateClientTotal(100000, 1, 200000)).toBe(0);
  });

  it('UT_F11_26 - Xác minh gateway lỗi thì createPayment đẩy lỗi ra ngoài', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false });
    gateway.createPaymentLink.mockRejectedValue(new Error('gateway failed'));

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow('gateway failed');
  });

  it('UT_F11_27 - Xác minh coupon hết hạn không được tính giảm giá', () => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);

    const discount = calculateClientDiscount(2000000, { discount_percent: 50, is_active: true, expired_at: expired });

    expect(discount).toBe(0);
  });

  it('UT_F11_28 - Xác minh coupon fixed hợp lệ được trừ vào total', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1000000, quantity: 2, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: 'FIXED', discount_amount: 100000, is_active: true });

    const result = await uc.createPayment({ orderId: 101, voucherCode: 'FIXED' });

    expect(result.amount).toBe(1900000);
  });

  it('UT_F11_29 - Xác minh đơn hàng pending chưa thanh toán được tạo link', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 2000000, quantity: 1, is_paid: false, status: 'pending' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.paymentUrl).toMatch(/^https?:\/\//);
  });

  it('UT_F11_30 - Xác minh tổng tiền sau giảm bằng 0 thì không tạo link thanh toán', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 100000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101, storedDiscount: 100000 })).rejects.toThrow(ValidationError);
    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  it('UT_F11_31 - Xác minh calculateClientDiscount không có coupon thì trả về 0', () => {
    expect(calculateClientDiscount(1000000)).toBe(0);
  });

  it('UT_F11_32 - Xác minh calculateClientDiscount với coupon không có trường giảm giá thì trả về 0', () => {
    expect(calculateClientDiscount(1000000, { is_active: true })).toBe(0);
  });

  it('UT_F11_33 - Xác minh calculateClientDiscount với coupon inactive thì trả về 0', () => {
    expect(calculateClientDiscount(1000000, { discount_percent: 50, is_active: false })).toBe(0);
  });

  it('UT_F11_34 - Xác minh calculateSummary mặc định quantity bằng 1 khi không có trên input và order', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 2500000, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101 });

    expect(summary.quantity).toBe(1);
    expect(summary.unitPrice).toBe(2500000);
  });

  it('UT_F11_35 - Xác minh updateOrderPaymentStatus báo lỗi khi đơn hàng không tồn tại', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.updateOrderPaymentStatus({ orderId: 999, isPaid: true })).rejects.toThrow(NotFoundError);
  });

  it('UT_F11_36 - Xác minh updateOrderPaymentStatus dùng order.update và order.reload khi model có method', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn().mockResolvedValue(undefined);
    const order = { id: 101, status: 'pending', payment_url: null, update, reload };
    orderRepo.findByPk.mockResolvedValue(order as any);

    const result = await uc.updateOrderPaymentStatus({ orderId: 101, isPaid: true, momoTransId: '123' });

    expect(update).toHaveBeenCalledWith({ is_paid: true, status: 'confirmed', payment_url: 'MOMO_123' });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result).toBe(order);
  });

  it('UT_F11_37 - Xác minh updateOrderPaymentStatus fallback qua repository.update khi order không có method update', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, status: 'pending', payment_url: 'OLD' });
    orderRepo.update.mockResolvedValue([1]);

    const result = await uc.updateOrderPaymentStatus({ orderId: 101, isPaid: false });

    expect(orderRepo.update).toHaveBeenCalledWith(
      { is_paid: false, status: 'pending', payment_url: 'OLD' },
      { where: { id: 101 } }
    );
    expect(result).toEqual({ id: 101, status: 'pending', payment_url: 'OLD', is_paid: false });
  });
});

