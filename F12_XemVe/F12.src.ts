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

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export interface IOrderRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface ITicketRepository {
  findByPk?(id: number): Promise<any | null>;
  findAndCountAll(options: any): Promise<{ rows: any[]; count: number }>;
}

export function normalizeSearch(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

export function filterTickets(tickets: any[], input: { status?: string; text?: string }) {
  const text = normalizeSearch(input.text);
  return tickets.filter((ticket) => {
    const statusMatched = !input.status || input.status === 'all' || ticket.status === input.status;
    const ticketCode = String(ticket.ticket_code ?? ticket.ticketCode ?? '').toLowerCase();
    const textMatched = !text || ticketCode.includes(text);
    return statusMatched && textMatched;
  });
}

export class GetTicketUseCase {
  constructor(private orderRepo: IOrderRepository, private ticketRepo?: ITicketRepository) {}

  async execute(input: { userId: number; orderId: number }) {
    const order = await this.orderRepo.findByPk(input.orderId);
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    if (order.user_id !== input.userId) throw new ForbiddenError('Khong co quyen xem ve nay');
    if (!['completed', 'paid', 'confirmed'].includes(order.status)) {
      throw new ValidationError('Don hang chua hoan thanh thanh toan');
    }
    return {
      ticketCode: order.ticket_code ?? `TKT-${order.id}`,
      tourName: order.tour_name,
      quantity: order.quantity,
      totalPrice: order.total_price,
    };
  }

  async list(input: { userId: number; status?: string; text?: string; page?: number; limit?: number }) {
    if (!this.ticketRepo) throw new ValidationError('Ticket repository chua duoc cau hinh');
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const where: any = { user_id: input.userId };
    if (input.status && input.status !== 'all') where.status = input.status;
    if (input.text) where.ticket_code = { like: `%${input.text}%` };

    const result = await this.ticketRepo.findAndCountAll({ where, limit, offset: (page - 1) * limit });
    return {
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }
}
