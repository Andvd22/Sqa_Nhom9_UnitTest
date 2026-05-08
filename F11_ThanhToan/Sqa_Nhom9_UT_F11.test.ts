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

describe('F11 - Thanh toan theo PaymentPage/bookingService that', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let gateway: jest.Mocked<IPaymentGateway>;
  let uc: PaymentUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    gateway = makeGateway();
    uc = new PaymentUseCase(orderRepo, gateway);
    gateway.createPaymentLink.mockResolvedValue({ url: 'https://momo.vn/pay/abc' });
  });

  it('UT_F11_01 - Tao link thanh toan voi amount bang total hien tai', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result).toEqual({ paymentUrl: 'https://momo.vn/pay/abc', amount: 5000000 });
    expect(gateway.createPaymentLink).toHaveBeenCalledWith(5000000, 101);
  });

  it('UT_F11_02 - Order khong ton tai tra NotFoundError', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.createPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);
    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  it('UT_F11_03 - Don hang da thanh toan bi tu choi', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, is_paid: true });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_04 - Gia tri duoi 10000 bi tu choi', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_05 - Gia tri tren 50000000 bi tu choi', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 51000000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_06 - Bien duoi 10000 duoc chap nhan', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 10000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(10000);
  });

  it('UT_F11_07 - Bien tren 50000000 duoc chap nhan', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 50000000, quantity: 1, is_paid: false });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(50000000);
  });

  it('UT_F11_08 - Coupon percent khong duoc vuot discount_limit', () => {
    const discount = calculateClientDiscount(7200000, {
      code: '1THANG5',
      discount_percent: 50,
      discount_limit: 15000,
      is_active: true,
    });

    expect(discount).toBe(15000);
  });

  it('UT_F11_09 - Coupon fixed tra dung so tien giam', () => {
    expect(calculateClientDiscount(2000000, { discount_amount: 100000, is_active: true })).toBe(100000);
  });

  it('UT_F11_10 - Coupon inactive khong giam gia', () => {
    expect(calculateClientDiscount(2000000, { discount_percent: 50, is_active: false })).toBe(0);
  });

  it('UT_F11_11 - Tong tien client bang subtotal tru discount', () => {
    expect(calculateClientTotal(1800000, 4, 3600000)).toBe(3600000);
  });

  it('UT_F11_12 - storedDiscount duoc giu nguyen neu khong tinh lai bang voucherCode', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 4, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 1, storedDiscount: 3600000 });

    expect(summary.subtotal).toBe(1800000);
    expect(summary.discount).toBe(3600000);
    expect(summary.total).toBe(0);
  });

  it('UT_F11_13 - Khi apply coupon lai thi discount tinh theo quantity hien tai', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 4, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: '1THANG5', discount_percent: 50, discount_limit: 15000, is_active: true });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 1, voucherCode: '1THANG5' });

    expect(summary.discount).toBe(15000);
    expect(summary.total).toBe(1785000);
  });

  it('UT_F11_14 - Amount gui sang gateway bang tong tien sau giam', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: 'SALE50', discount_percent: 50, is_active: true });

    const result = await uc.createPayment({ orderId: 101, quantity: 2, voucherCode: 'SALE50' });

    expect(gateway.createPaymentLink).toHaveBeenCalledWith(1800000, 101);
    expect(result.amount).toBe(1800000);
  });

  it('UT_F11_15 - verifyPayment tra isPaid va paidAt', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: true, paid_at: '2024-06-15T10:00:00Z' });

    const result = await uc.verifyPayment({ orderId: 101 });

    expect(result).toEqual({ isPaid: true, paidAt: '2024-06-15T10:00:00Z' });
  });

  it('UT_F11_16 - verifyPayment khong ghi DB', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, is_paid: false, paid_at: null });

    await uc.verifyPayment({ orderId: 101 });

    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  it('UT_F11_17 - Don cancelled van tao link thanh toan theo source hien tai', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false, status: 'cancelled' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.amount).toBe(5000000);
  });

  it('UT_F11_18 - Quantity khong phai so nguyen bi tu choi khi tinh summary thanh toan', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });

    await expect(uc.calculateSummary({ orderId: 101, quantity: 1.5 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_19 - verifyPayment order khong ton tai tra NotFoundError', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.verifyPayment({ orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F11_20 - Ma loi ValidationError va NotFoundError dung', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F11_21 - Quantity bang 0 bi tu choi khi tinh summary', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 2, is_paid: false });

    await expect(uc.calculateSummary({ orderId: 101, quantity: 0 })).rejects.toThrow(ValidationError);
  });

  it('UT_F11_22 - Khi khong co unit_price thi lay gia tu tour.price', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, tour: { price: 2500000 }, quantity: 2, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101, quantity: 2 });

    expect(summary.subtotal).toBe(5000000);
    expect(summary.unitPrice).toBe(2500000);
  });

  it('UT_F11_23 - Khi khong co unit_price va tour.price thi suy ra tu total_price chia quantity', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 6000000, quantity: 3, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101 });

    expect(summary.unitPrice).toBe(2000000);
    expect(summary.subtotal).toBe(6000000);
  });

  it('UT_F11_24 - Coupon khong ton tai thi discount bang 0', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1800000, quantity: 1, is_paid: false });
    voucherRepo.findOne.mockResolvedValue(null);

    const summary = await uc.calculateSummary({ orderId: 101, voucherCode: 'NOTFOUND' });

    expect(summary.discount).toBe(0);
    expect(summary.total).toBe(1800000);
  });

  it('UT_F11_25 - Fixed discount lon hon subtotal lam total ve 0 theo client', () => {
    expect(calculateClientTotal(100000, 1, 200000)).toBe(0);
  });

  it('UT_F11_26 - Gateway loi thi createPayment day loi ra ngoai', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 5000000, quantity: 1, is_paid: false });
    gateway.createPaymentLink.mockRejectedValue(new Error('gateway failed'));

    await expect(uc.createPayment({ orderId: 101 })).rejects.toThrow('gateway failed');
  });

  it('UT_F11_27 - Coupon het han khong duoc tinh giam gia', () => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);

    const discount = calculateClientDiscount(2000000, { discount_percent: 50, is_active: true, expired_at: expired });

    expect(discount).toBe(0);
  });

  it('UT_F11_28 - Coupon fixed hop le duoc tru vao total', async () => {
    const voucherRepo = makeVoucherRepo();
    uc = new PaymentUseCase(orderRepo, gateway, voucherRepo);
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 1000000, quantity: 2, is_paid: false });
    voucherRepo.findOne.mockResolvedValue({ code: 'FIXED', discount_amount: 100000, is_active: true });

    const result = await uc.createPayment({ orderId: 101, voucherCode: 'FIXED' });

    expect(result.amount).toBe(1900000);
  });

  it('UT_F11_29 - Don hang pending chua thanh toan duoc tao link', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 2000000, quantity: 1, is_paid: false, status: 'pending' });

    const result = await uc.createPayment({ orderId: 101 });

    expect(result.paymentUrl).toMatch(/^https?:\/\//);
  });

  it('UT_F11_30 - Tong tien sau giam bang 0 thi khong tao link thanh toan', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, unit_price: 100000, quantity: 1, is_paid: false });

    await expect(uc.createPayment({ orderId: 101, storedDiscount: 100000 })).rejects.toThrow(ValidationError);
    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });

  it('UT_F11_31 - calculateClientDiscount khong co coupon thi tra ve 0', () => {
    expect(calculateClientDiscount(1000000)).toBe(0);
  });

  it('UT_F11_32 - calculateClientDiscount coupon khong co truong giam gia thi tra ve 0', () => {
    expect(calculateClientDiscount(1000000, { is_active: true })).toBe(0);
  });

  it('UT_F11_32A - calculateClientDiscount coupon inactive thi tra ve 0', () => {
    expect(calculateClientDiscount(1000000, { discount_percent: 50, is_active: false })).toBe(0);
  });

  it('UT_F11_33 - calculateSummary khong co quantity tren input va order thi mac dinh bang 1', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, total_price: 2500000, is_paid: false });

    const summary = await uc.calculateSummary({ orderId: 101 });

    expect(summary.quantity).toBe(1);
    expect(summary.unitPrice).toBe(2500000);
  });

  it('UT_F11_34 - updateOrderPaymentStatus bao loi khi don hang khong ton tai', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.updateOrderPaymentStatus({ orderId: 999, isPaid: true })).rejects.toThrow(NotFoundError);
  });

  it('UT_F11_35 - updateOrderPaymentStatus dung order.update va order.reload khi model co method', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn().mockResolvedValue(undefined);
    const order = { id: 101, status: 'pending', payment_url: null, update, reload };
    orderRepo.findByPk.mockResolvedValue(order as any);

    const result = await uc.updateOrderPaymentStatus({ orderId: 101, isPaid: true, momoTransId: '123' });

    expect(update).toHaveBeenCalledWith({ is_paid: true, status: 'confirmed', payment_url: 'MOMO_123' });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result).toBe(order);
  });

  it('UT_F11_36 - updateOrderPaymentStatus fallback qua repository.update khi order khong co method update', async () => {
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

