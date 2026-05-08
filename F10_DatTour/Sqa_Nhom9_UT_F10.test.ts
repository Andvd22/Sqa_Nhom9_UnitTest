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

describe('F10 - Dat tour theo bookingService that', () => {
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

  it('UT_F10_01 - Dat tour thanh cong va tao payment voi amount sau tinh tien', async () => {
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

  it('UT_F10_02 - User khong ton tai thi khong tao order', async () => {
    userRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 99, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(NotFoundError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_03 - Tour khong ton tai thi tra NotFoundError', async () => {
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.execute({ userId: 1, tourId: 999, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F10_04 - Quantity bang 0 bi tu choi', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 0, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_05 - Quantity thap phan bi tu choi vi so luong ve phai la so nguyen duong', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1.5, startDate: futureDate() })
    ).rejects.toThrow('So luong ve phai la so nguyen duong');
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_06 - Ngay khoi hanh trong qua khu bi tu choi', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: past })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_07 - Ngay khoi hanh cach dung 2 ngay duoc chap nhan', async () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: date });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_08 - So ve vuot ghe con lai bi tu choi theo Order.sum', async () => {
    orderRepo.sum.mockResolvedValue(25);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 6, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_09 - Tour het cho khi capacity tru sold bang 0', async () => {
    orderRepo.sum.mockResolvedValue(30);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_10 - Tour paused van duoc dat neu repository tra ve tour theo source hien tai', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, status: 'paused' });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_11 - Coupon percent khong duoc giam qua discount_limit', async () => {
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

  it('UT_F10_12 - Coupon fixed khong lam tong tien am', () => {
    expect(calculateCouponTotal(100000, { discount_amount: 200000 })).toBe(0);
  });

  it('UT_F10_13 - Coupon inactive bi tu choi', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: false });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_14 - Khong co huong dan vien thi bi tu choi', async () => {
    const guideService = makeGuideService();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, undefined, guideService);
    guideService.hasAvailableGuide.mockResolvedValue(false);

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_15 - Gia tri don hang duoi 10000 bi tu choi', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 5000, capacity: 30 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_16 - Gia tri don hang tren 50000000 bi tu choi', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 51000000, capacity: 30 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_17 - Dung gia tour moi nhat tu repository', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 4000000, capacity: 30 });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.totalPrice).toBe(4000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ unit_price: 4000000 }));
  });

  it('UT_F10_18 - Goi Order.sum voi cac status tinh ve da ban', async () => {
    await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(orderRepo.sum).toHaveBeenCalledWith('quantity', expect.objectContaining({
      where: { tour_id: 10, status: ['pending', 'confirmed', 'completed'] },
    }));
  });

  it('UT_F10_19 - Coupon het luot su dung bi tu choi', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: true, max_use: 0 });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_20 - Ma loi ValidationError va NotFoundError dung', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F10_21 - TourId bang 0 bi tu choi truoc khi query user', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 0, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
    expect(userRepo.findByPk).not.toHaveBeenCalled();
  });

  it('UT_F10_22 - UserId khong hop le bi tu choi truoc khi query DB', async () => {
    await expect(
      uc.execute({ userId: 0, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
    expect(userRepo.findByPk).not.toHaveBeenCalled();
  });

  it('UT_F10_23 - Quantity NaN bi tu choi', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: Number.NaN, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_24 - Coupon het han bi tu choi', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: true, max_use: 10, expired_at: expired });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_25 - CouponId co nhung khong cau hinh couponRepo thi bi bo qua nhu source mock', async () => {
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 99 });

    expect(result.totalPrice).toBe(2000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ coupon_id: 99 }));
  });

  it('UT_F10_26 - Khong cau hinh paymentService van tao order thanh cong', async () => {
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.payment).toBeUndefined();
    expect(orderRepo.create).toHaveBeenCalled();
  });

  it('UT_F10_27 - Coupon percent duoc gioi han boi discount_limit neu co', () => {
    expect(calculateCouponTotal(4000000, { discount_percent: 25, discount_limit: 500000 })).toBe(3500000);
  });

  it('UT_F10_28 - Order.create loi thi payment khong duoc goi de tranh sai trang thai', async () => {
    orderRepo.create.mockRejectedValue(new Error('create failed'));

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() })
    ).rejects.toThrow('create failed');
    expect(paymentService.createPayment).not.toHaveBeenCalled();
  });

  it('UT_F10_29 - Quantity dang chu so hop le duoc convert va dat tour', async () => {
    const result = await uc.execute({ userId: 1, tourId: 10, quantity: '2' as any, startDate: futureDate() });

    expect(result.totalPrice).toBe(4000000);
    expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });

  it('UT_F10_30 - Quantity am bi tu choi', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: -1, startDate: futureDate() })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F10_31 - Tour inactive van duoc dat neu repository tra ve tour theo source hien tai', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, status: 'inactive' });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
  });

  it('UT_F10_32 - Co huong dan vien kha dung thi tiep tuc tao order', async () => {
    const guideService = makeGuideService();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, undefined, guideService);
    guideService.hasAvailableGuide.mockResolvedValue(true);

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate() });

    expect(result.orderId).toBe(100);
    expect(guideService.hasAvailableGuide).toHaveBeenCalledWith(10);
  });

  it('UT_F10_33 - Tour khong co start_date va cung khong truyen startDate thi bao loi', async () => {
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, start_date: null, end_date: null });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1 })
    ).rejects.toThrow(ValidationError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_34 - Tour co start_date nhung thieu end_date thi bao loi', async () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    tourRepo.findByPk.mockResolvedValue({ id: 10, price: 2000000, capacity: 30, start_date: date, end_date: null });

    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 1 })
    ).rejects.toThrow(ValidationError);
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F10_35 - Coupon is_active dang chuoi 1 van duoc xem la hop le', async () => {
    const couponRepo = makeCouponRepo();
    uc = new CreateOrderUseCase(userRepo, tourRepo, orderRepo, paymentService, couponRepo);
    couponRepo.findByPk.mockResolvedValue({ id: 7, is_active: '1', discount_amount: 100000, max_use: 10 });

    const result = await uc.execute({ userId: 1, tourId: 10, quantity: 1, startDate: futureDate(), couponId: 7 });

    expect(result.totalPrice).toBe(1900000);
  });

  it('UT_F10_36 - So luong ve bang 0 tra dung thong diep so nguyen duong', async () => {
    await expect(
      uc.execute({ userId: 1, tourId: 10, quantity: 0, startDate: futureDate() })
    ).rejects.toThrow('So luong ve phai la so nguyen duong');
  });
});

