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

export interface IOrderRecord {
  id?: number;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  is_paid?: boolean;
  paid_at?: any;
  status?: string;
  payment_url?: string;
  update?(data: any): Promise<any>;
  reload?(): Promise<void>;
}

export interface IOrderRepository {
  findByPk(id: number): Promise<IOrderRecord | null>;
  update(data: any, options: any): Promise<any>;
}

export interface IPaymentGateway {
  createPaymentLink(amount: number, orderId: number): Promise<{ url: string }>;
}

export interface IVoucherRepository {
  findOne(options: any): Promise<any | null>;
}

export interface ITicketLifecycleService {
  createTicketsForOrder?(order: IOrderRecord): Promise<any>;
}

export interface IGuideAssignmentService {
  assignGuideForOrder?(order: IOrderRecord): Promise<any>;
}

export interface IEmailService {
  sendPaymentConfirmation?(orderId: number): Promise<any>;
}

export function calculateClientDiscount(subtotal: number, coupon?: any): number {
  if (!coupon || coupon.is_active === false || coupon.active === false) return 0;
  if (coupon.discount_amount) return Number(coupon.discount_amount);
  if (coupon.discount_percent) {
    return Math.round((subtotal * Number(coupon.discount_percent)) / 100);
  }
  return 0;
}

export function calculateClientTotal(unitPrice: number, quantity: number, discount: number): number {
  return Math.max(unitPrice * quantity - discount, 0);
}

export class PaymentUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private gateway: IPaymentGateway,
    private voucherRepo?: IVoucherRepository,
    private ticketSvc?: ITicketLifecycleService,
    private guideSvc?: IGuideAssignmentService,
    private emailSvc?: IEmailService
  ) {}

  async calculateSummary(input: { orderId: number; quantity?: number; voucherCode?: string; storedDiscount?: number }) {
    const order = await this.orderRepo.findByPk(input.orderId);
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    if (order.is_paid) throw new ValidationError('Don hang da thanh toan');

    const quantity = input.quantity ?? order.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError('So luong ve phai la so nguyen duong');
    }

    const unitPrice = Number((order as any).unit_price ?? (order as any).tour?.price ?? Number(order.total_price ?? 0) / ((order.quantity || 1) as number));
    let discount = input.storedDiscount ?? 0;
    if (input.voucherCode && this.voucherRepo) {
      const coupon = await this.voucherRepo.findOne({ where: { code: input.voucherCode } });
      discount = calculateClientDiscount(unitPrice * quantity, coupon);
    }

    const subtotal = unitPrice * quantity;
    return { subtotal, discount, total: calculateClientTotal(unitPrice, quantity, discount), quantity, unitPrice };
  }

  async createPayment(input: { orderId: number; quantity?: number; voucherCode?: string; storedDiscount?: number }) {
    const summary = await this.calculateSummary(input);
    if (summary.total < 10000) throw new ValidationError('Gia tri don hang phai tu 10,000d');
    if (summary.total > 50000000) throw new ValidationError('Gia tri don hang toi da 50,000,000d');

    const link = await this.gateway.createPaymentLink(summary.total, input.orderId);
    return { paymentUrl: link.url, amount: summary.total };
  }

  async verifyPayment(input: { orderId: number }) {
    const order = await this.orderRepo.findByPk(input.orderId);
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    return { isPaid: !!order.is_paid, paidAt: order.paid_at };
  }

  async updateOrderPaymentStatus(input: { orderId: number; isPaid: boolean; momoTransId?: string }) {
    const order = await this.orderRepo.findByPk(input.orderId);
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    const wasPaid = !!order.is_paid;

    const nextData = {
      is_paid: input.isPaid,
      status: input.isPaid ? 'confirmed' : order.status,
      payment_url: input.momoTransId ? `MOMO_${input.momoTransId}` : order.payment_url,
    };

    if (order.update) {
      await order.update(nextData);
      await order.reload?.();
      if (input.isPaid && !wasPaid) {
        await this.ticketSvc?.createTicketsForOrder?.(order);
        await this.emailSvc?.sendPaymentConfirmation?.(input.orderId);
        await this.guideSvc?.assignGuideForOrder?.(order);
      }
      return order;
    }

    await this.orderRepo.update(nextData, { where: { id: input.orderId } });
    const mergedOrder = { ...order, ...nextData };
    if (input.isPaid && !wasPaid) {
      await this.ticketSvc?.createTicketsForOrder?.(mergedOrder);
      await this.emailSvc?.sendPaymentConfirmation?.(input.orderId);
      await this.guideSvc?.assignGuideForOrder?.(mergedOrder);
    }
    return mergedOrder;
  }
}
