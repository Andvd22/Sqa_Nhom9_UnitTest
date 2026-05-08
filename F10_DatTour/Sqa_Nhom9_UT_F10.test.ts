import {
  CreateOrderUseCase,
  calculateCouponTotal,
  ValidationError,
  NotFoundError,
  IUserRepository,
  ITourRepository,
  IOrderRepository,
  IPaymentService,
  ICouponRepository,
  IGuideService,
} from './F10.src';

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeTourRepo(): jest.Mocked<ITourRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { create: jest.fn(), sum: jest.fn() } as any;
}

function makePaymentService(): jest.Mocked<IPaymentService> {
  return { createPayment: jest.fn() } as any;
}

function makeCouponRepo(): jest.Mocked<ICouponRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeGuideService(): jest.Mocked<IGuideService> {
  return { hasAvailableGuide: jest.fn() } as any;
}

describe('F10 - Đặt tour theo bookingService', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let tourRepo: jest.Mocked<ITourRepository>;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let paymentService: jest.Mocked<IPaymentService>;
  let uc: CreateOrderUseCase;

  const futureDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date;
  };

  beforeEach(() => {
    userRepo = makeUserRepo();
    tourRepo = makeTourRepo();
    orderRepo = makeOrderRepo();
    paymentService = makePaymentService();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService);
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30 });
    orderRepo.sum.mockResolvedValue(0);
    orderRepo.create.mockResolvedValue({ id: 100 });
    paymentService.createPayment.mockResolvedValue({ payUrl: 'https://momo.vn/pay/100' });
  });

  it('UT_F10_01 - Xác minh đặt tour thành công và tạo payment với amount sau tính tiền', async () => {
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: futureDate() });

    expect(result).toMatchObject({ orderId: 100, totalPrice: 4000000, status: 'pending' });
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 1,
      tour_id: 10,
      quantity: 2,
      unit_price: 2000000,
      total_price: 4000000,
      status: 'pending',
    }));
    expect(paymentService.createPayment).toHaveBeenCalledWith({ order_id: 100, amount: 4000000 });
  });

  it('UT_F10_02 - Xác minh không tạo order khi người dùng không tồn tại', async () => {
    userRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 99, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(NotFoundError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_03 - Xác minh NotFoundError khi tour không tồn tại', async () => {
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 1, tourId: 999, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F10_04 - Xác minh ValidationError khi quantity bằng 0', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 0, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_05 - Xác minh ValidationError khi quantity là số thập phân', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1.5, startDate: futureDate() })
    ).rejects.toThrow('So luong ve phai la so nguyen duong');
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_06 - Xác minh ValidationError khi ngày khởi hành trong quá khứ', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: past })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_07 - Xác minh ngày khởi hành cách đúng 2 ngày được chấp nhận', async () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: date });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_08 - Xác minh ValidationError khi số vé vượt số ghế còn lại', async () => {
    orderRepo.sum.mockResolvedValue(25);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 6, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_09 - Xác minh ValidationError khi tour hết chỗ', async () => {
    orderRepo.sum.mockResolvedValue(30);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_10 - Xác minh tour paused vẫn được đặt theo source hiện tại', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, status: 'paused' });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_11 - Xác minh coupon phần trăm không được giảm quá discount_limit', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({
      id: 7,
      is_active: true,
      discount_percent: 50,
      discount_limit: 15000,
      max_use: 100,
    });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 2, startDate: futureDate(), couponId: 7 });

    expect(result.totalPrice).toBe(3985000);
    expect(paymentService.createPayment).toHaveBeenCalledWith({ order_id: 100, amount: 3985000 });
  });

  it('UT_F10_12 - Xác minh coupon fixed không làm tổng tiền âm', () => {
    expect(calculateCouponTotal(100000, { discount_amount: 200000 })).toBe(0);
  });

  it('UT_F10_13 - Xác minh ValidationError khi coupon inactive', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: false });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_14 - Xác minh ValidationError khi không có hướng dẫn viên', async () => {
    const guideService = makeGuideService();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, undefined, guideService);
    guideService.hasAvailableGuide.mockResolvedValue(false);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_15 - Xác minh ValidationError khi giá trị đơn hàng dưới 10000', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 5000, capacity: 30 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_16 - Xác minh ValidationError khi giá trị đơn hàng trên 50000000', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 51000000, capacity: 30 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_17 - Xác minh dùng giá tour mới nhất từ repository', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 4000000, capacity: 30 });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.totalPrice).toBe(4000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ unit_price: 4000000 }));
  });

  it('UT_F10_18 - Xác minh gọi Order.sum với các trạng thái tính vé đã bán', async () => {
    await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(orderRepo.sum).toHaveBeenCalledWith('quantity', expect.objectContaining({
      where: { tour_id: 10, status: ['pending', 'confirmed', 'completed'] },
    }));
  });

  it('UT_F10_19 - Xác minh ValidationError khi coupon hết lượt sử dụng', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: true, max_use: 0 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_20 - Xác minh mã lỗi ValidationError và NotFoundError đúng', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F10_21 - Xác minh tourId bằng 0 bị từ chối trước khi query user', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 0, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
    expect(userRepo.findByPk).not.toHaveBeenCalled();
  });

  it('UT_F10_22 - Xác minh userId không hợp lệ bị từ chối trước khi query DB', async () => {
    await expect(
      uc.execute({ userId: 0, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
    expect(userRepo.findByPk).not.toHaveBeenCalled();
  });

  it('UT_F10_23 - Xác minh ValidationError khi quantity là NaN', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: Number.NaN, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_24 - Xác minh ValidationError khi coupon hết hạn', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: true, max_use: 10, expired_at: expired });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_25 - Xác minh couponId có nhưng không cấu hình couponRepo thì bị bỏ qua theo source hiện tại', async () => {
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 99 });

    expect(result.totalPrice).toBe(2000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ coupon_id: 99 }));
  });

  it('UT_F10_26 - Xác minh không cấu hình paymentService vẫn tạo order thành công', async () => {
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.payment).toBeUndefined();
    expect(orderRepo.create).toHaveBeenCalled();
  });

  it('UT_F10_27 - Xác minh coupon phần trăm được giới hạn bởi discount_limit nếu có', () => {
    expect(calculateCouponTotal(4000000, { discount_percent: 25, discount_limit: 500000 })).toBe(3500000);
  });

  it('UT_F10_28 - Xác minh Order.create lỗi thì payment không được gọi', async () => {
    orderRepo.create.mockRejectedValue(new Error('create failed'));

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow('create failed');
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it('UT_F10_29 - Xác minh quantity dạng chuỗi số hợp lệ được convert và đặt tour', async () => {
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: '2' as any, startDate: futureDate() });

    expect(result.totalPrice).toBe(4000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });

  it('UT_F10_30 - Xác minh ValidationError khi quantity âm', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: -1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_31 - Xác minh tour inactive vẫn được đặt theo source hiện tại', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, status: 'inactive' });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_32 - Xác minh có hướng dẫn viên khả dụng thì tiếp tục tạo order', async () => {
    const guideService = makeGuideService();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, undefined, guideService);
    guideService.hasAvailableGuide.mockResolvedValue(true);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
    expect(guideService.hasAvailableGuide).toHaveBeenCalledWith(10);
  });

  it('UT_F10_33 - Xác minh ValidationError khi tour không có start_date và cũng không truyền startDate', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, start_date: null, end_date: null });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1 })
    ).rejects.toThrow(ValidationError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_34 - Xác minh ValidationError khi tour có start_date nhưng thiếu end_date', async () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, start_date: date, end_date: null });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1 })
    ).rejects.toThrow(ValidationError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_35 - Xác minh coupon is_active dạng chuỗi 1 vẫn được xem là hợp lệ', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: '1', discount_amount: 100000, max_use: 10 });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 });

    expect(result.totalPrice).toBe(1900000);
  });

  it('UT_F10_36 - Xác minh quantity bằng 0 trả đúng thông điệp số nguyên dương', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 0, startDate: futureDate() })
    ).rejects.toThrow('So luong ve phai la so nguyen duong');
  });
});

