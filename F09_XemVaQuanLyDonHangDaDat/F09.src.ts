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
  findAndCountAll(options: any): Promise<{ rows: any[]; count: number }>;
  findOne(options: any): Promise<any | null>;
  update(data: any, options: any): Promise<[number] | any>;
}

export interface IUserRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface ITourRepository {
  findByPk(id: number): Promise<any | null>;
}

export interface IReviewRepository {
  create(data: any): Promise<any>;
}

export interface IReviewImageRepository {
  bulkCreate(data: any[]): Promise<any>;
}

export class GetUserOrdersUseCase {
  constructor(private orderRepo: IOrderRepository) {}

  async execute(input: { userId: number; page?: number; limit?: number }) {
    const page = input.page || 1;
    const limit = input.limit || 10;
    const offset = (page - 1) * limit;
    const result = await this.orderRepo.findAndCountAll({
      where: { user_id: input.userId },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      orders: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }

  async getOrderDetail(input: { userId: number; orderId: number }) {
    const order = await this.orderRepo.findOne({ where: { id: input.orderId } });
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    if (order.user_id !== input.userId) {
      throw new ForbiddenError('Khong co quyen xem don hang nay');
    }
    return order;
  }
}

export class ReviewTourUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private reviewRepo: IReviewRepository,
    private reviewImageRepo?: IReviewImageRepository,
    private userRepo?: IUserRepository,
    private tourRepo?: ITourRepository
  ) {}

  async execute(input: {
    userId: number;
    orderId: number;
    tourId: number;
    rating: number;
    text?: string;
    comment?: string;
    images?: string[];
  }) {
    const tourId = Number(input.tourId);
    if (Number.isNaN(tourId) || tourId <= 0) throw new ValidationError('Tour khong hop le');

    if (this.tourRepo) {
      const tour = await this.tourRepo.findByPk(tourId);
      if (!tour) throw new NotFoundError('Tour khong ton tai');
    }

    if (this.userRepo) {
      const user = await this.userRepo.findByPk(input.userId);
      if (!user) throw new NotFoundError('Nguoi dung khong ton tai');
    }

    if (!input.orderId || Number.isNaN(Number(input.orderId)) || Number(input.orderId) <= 0) {
      throw new ValidationError('Don hang khong hop le');
    }

    const order = await this.orderRepo.findOne({ where: { id: input.orderId } });
    if (!order) throw new NotFoundError('Don hang khong ton tai');
    if (order.user_id !== input.userId) throw new ForbiddenError('Khong co quyen danh gia don hang nay');
    if (order.tour_id !== input.tourId) throw new ValidationError('Don hang khong thuoc tour nay');
    if (order.status !== 'completed') throw new ValidationError('Chi duoc danh gia don da hoan thanh');
    if (Boolean(order.is_review)) throw new ValidationError('Don hang da duoc danh gia');
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ValidationError('Diem danh gia phai tu 1 den 5');
    }

    const incomingText = input.text ?? input.comment;
    const createData: any = {
      user_id: input.userId,
      tour_id: input.tourId,
      rating: input.rating,
    };
    if (incomingText && incomingText.trim() !== '') {
      createData.text = incomingText.trim();
    }

    const review = await this.reviewRepo.create(createData);
    const images = (input.images ?? []).filter((image) => image && image.trim() !== '');
    if (images.length > 0 && this.reviewImageRepo) {
      await this.reviewImageRepo.bulkCreate(
        images.map((image) => ({ review_id: review.id, image_url: image.trim() }))
      );
    }

    const updateResult = await this.orderRepo.update({ is_review: true }, { where: { id: input.orderId } });
    const affectedRows = Array.isArray(updateResult) ? Number(updateResult[0] ?? 0) : Number(updateResult ?? 0);
    if (affectedRows === 0) {
      throw new ValidationError('Khong the cap nhat trang thai danh gia don hang');
    }

    return review;
  }
}
