export class AppError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export interface IUserRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface ITourRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface IOrderRepository {
  create(data: any): Promise<any>;
  sum(field: string, options: any): Promise<number | null>;
}

export interface ICouponRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface IPaymentService {
  createPayment(data: any): Promise<any>;
}

export interface IGuideService {
  hasAvailableGuide(tourId: number): Promise<boolean>;
}

export function daysUntil(date: Date, now = new Date()): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / 86400000);
}

export function calculateCouponTotal(totalPrice: number, coupon?: any): number {
  if (!coupon) return totalPrice;
  let result = totalPrice;
  if (coupon.discount_percent) {
    result -= (totalPrice * Number(coupon.discount_percent)) / 100;
  } else if (coupon.discount_amount) {
    result -= Number(coupon.discount_amount);
  }
  return Math.max(0, Math.round(result * 100) / 100);
}

function toBooleanFlag(value: any): boolean {
  return value === true || value === 1 || value === '1';
}

export class CreateOrderUseCase {
  constructor(
    private userRepo: IUserRepository,
    private tourRepo: ITourRepository,
    private orderRepo: IOrderRepository,
    private paymentService?: IPaymentService,
    private couponRepo?: ICouponRepository,
    private guideService?: IGuideService
  ) {}

  async execute(input: {
    userId: number;
    tourId: number;
    quantity: number;
    startDate?: Date;
    couponId?: number;
  }) {
    const tourId = Number(input.tourId);
    const userId = Number(input.userId);
    const quantity = Number(input.quantity);

    if (Number.isNaN(tourId) || tourId <= 0) throw new ValidationError('Tour khong hop le');
    if (Number.isNaN(userId) || userId <= 0) throw new ValidationError('Nguoi dung khong hop le');
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new ValidationError('So luong ve phai lon hon 0');
    }

    const user = await this.userRepo.findByPk(userId);
    if (!user) throw new NotFoundError('Nguoi dung khong ton tai');

    const tour = await this.tourRepo.findByPk(tourId);
    if (!tour) throw new NotFoundError('Tour khong ton tai');

    let coupon: any;
    if (input.couponId && this.couponRepo) {
      coupon = await this.couponRepo.findByPk(input.couponId);
      if (!coupon) throw new ValidationError('Ma giam gia khong ton tai');
      if (!toBooleanFlag(coupon.is_active ?? coupon.active ?? true)) {
        throw new ValidationError('Ma giam gia khong hop le');
      }
      const expireAt = coupon.expire_at ?? coupon.expired_at;
      if (expireAt) {
        const expireDate = new Date(expireAt);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        if (expireDate < currentDate) throw new ValidationError('Ma giam gia da het han');
      }
      if (Number(coupon.max_use) === 0) throw new ValidationError('Ma giam gia da het luot su dung');
    }

    const tourStartDate = tour.start_date ? new Date(tour.start_date) : input.startDate ? new Date(input.startDate) : null;
    const tourEndDate = tour.end_date ? new Date(tour.end_date) : null;
    if (!tourStartDate) {
      throw new ValidationError('Tour khong co thong tin ngay bat dau');
    }
    if ((tour.start_date || tour.end_date) && !tourEndDate) {
      throw new ValidationError('Tour khong co thong tin ngay ket thuc');
    }
    if (daysUntil(tourStartDate) < 2) {
      throw new ValidationError('Khong the dat tour qua gan ngay khoi hanh');
    }

    if (this.guideService) {
      const hasGuide = await this.guideService.hasAvailableGuide(tourId);
      if (!hasGuide) throw new ValidationError('Khong co huong dan vien phu hop');
    }

    const sold = await this.orderRepo.sum('quantity', {
      where: { tour_id: tourId, status: ['pending', 'confirmed', 'completed'] },
    });
    const remaining = Number(tour.capacity) - Number(sold ?? 0);
    if (remaining <= 0) throw new ValidationError('Tour da het cho');
    if (quantity > remaining) throw new ValidationError(`So luong ve con lai cua tour chi con ${remaining}`);

    const originalTotal = Number(tour.price) * quantity;
    const totalPrice = calculateCouponTotal(originalTotal, coupon);
    if (totalPrice < 10000) throw new ValidationError('Gia tri don hang phai tu 10,000d');
    if (totalPrice > 50000000) throw new ValidationError('Gia tri don hang toi da 50,000,000d');

    const order = await this.orderRepo.create({
      user_id: userId,
      tour_id: tourId,
      quantity,
      unit_price: Number(tour.price),
      total_price: totalPrice,
      status: 'pending',
      coupon_id: input.couponId,
      start_date: tourStartDate,
      end_date: tourEndDate ?? undefined,
    });
    const payment = await this.paymentService?.createPayment({ order_id: order.id, amount: totalPrice });
    return { orderId: order.id, totalPrice, status: 'pending', payment };
  }
}
