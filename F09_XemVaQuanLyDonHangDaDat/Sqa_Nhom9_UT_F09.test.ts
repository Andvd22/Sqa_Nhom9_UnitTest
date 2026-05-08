import {
  GetUserOrdersUseCase,
  ReviewTourUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  IOrderRepository,
  IReviewRepository,
  IReviewImageRepository,
} from './F09.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
  } as any;
}

function makeReviewRepo(): jest.Mocked<IReviewRepository> {
  return { create: jest.fn() } as any;
}

function makeImageRepo(): jest.Mocked<IReviewImageRepository> {
  return { bulkCreate: jest.fn() } as any;
}

function makeUserRepo() {
  return { findByPk: jest.fn() } as any;
}

function makeTourRepo() {
  return { findByPk: jest.fn() } as any;
}

describe('F09 - Xem và quản lý đơn hàng đã đặt', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: GetUserOrdersUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    uc = new GetUserOrdersUseCase(orderRepo);
  });

  it('UT_F09_01 - Xác minh lấy danh sách đơn hàng theo user_id', async () => {
    const rows = [{ id: 101, status: 'pending' }, { id: 102, status: 'confirmed' }];
    orderRepo.findAndCountAll.mockResolvedValue({ rows, count: 2 });

    const result = await uc.execute({ userId: 1, page: 1, limit: 10 });

    expect(result.orders).toEqual(rows);
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: 1 },
      limit: 10,
      offset: 0,
      order: [['created_at', 'DESC']],
    }));
  });

  it('UT_F09_02 - Xác minh dùng page và limit mặc định khi không truyền', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 0 }));
  });

  it('UT_F09_03 - Xác minh tính offset đúng khi page = 3 và limit = 5', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 11 });

    const result = await uc.execute({ userId: 1, page: 3, limit: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 }));
    expect(result.pagination.totalPages).toBe(3);
  });

  it('UT_F09_04 - Xác minh lấy chi tiết đơn hàng thành công', async () => {
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(result.id).toBe(101);
    expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 101 } });
  });

  it('UT_F09_05 - Xác minh NotFoundError khi đơn hàng không tồn tại', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(uc.getOrderDetail({ userId: 1, orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_06 - Xác minh không được xem đơn hàng của người dùng khác', async () => {
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 2 });

    await expect(uc.getOrderDetail({ userId: 1, orderId: 101 })).rejects.toThrow(ForbiddenError);
  });

  it('UT_F09_07 - Xác minh trạng thái pending, confirmed, cancelled vẫn được trả về trong danh sách', async () => {
    const rows = [{ status: 'pending' }, { status: 'confirmed' }, { status: 'cancelled' }];
    orderRepo.findAndCountAll.mockResolvedValue({ rows, count: rows.length });

    const result = await uc.execute({ userId: 1 });

    expect(result.orders.map((order) => order.status)).toEqual(['pending', 'confirmed', 'cancelled']);
  });

  it('UT_F09_08 - Xác minh chỉ cho review đơn hàng có trạng thái completed', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'confirmed' });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_09 - Xác minh ValidationError khi nội dung review chỉ có khoảng trắng', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: '   ' })
    ).rejects.toThrow(ValidationError);
    expect(reviewRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F09_10 - Xác minh review hợp lệ được trim text và đánh dấu đơn đã review', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 4, text: '  Tour tot  ' });

    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 1, tour_id: 9, rating: 4, text: 'Tour tot' }));
    expect(orderRepo.update).toHaveBeenCalledWith({ is_review: true }, { where: { id: 101 } });
  });

  it('UT_F09_11 - Xác minh ValidationError khi file không phải ảnh', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['review.pdf'] })
    ).rejects.toThrow(ValidationError);
    expect(imageRepo.bulkCreate).not.toHaveBeenCalled();
  });

  it('UT_F09_12 - Xác minh không cho review lại đơn hàng đã review', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: true });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_13 - Xác minh ValidationError khi rating ngoài khoảng từ 1 đến 5', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 6, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_14 - Xác minh review bị chặn khi order không thuộc tour', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 8, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_15 - Xác minh review với comment thay cho text vẫn được lưu', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, comment: '  Rat tot  ' });

    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 1, tour_id: 9, rating: 5, text: 'Rat tot' }));
  });

  it('UT_F09_16 - Xác minh review bỏ qua image rỗng trong danh sách images', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['', ' a.png '] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([{ review_id: 501, image_url: 'a.png' }]);
  });

  it('UT_F09_17 - Xác minh review không có imageRepo vẫn thành công nếu có images', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['x.png'] })
    ).resolves.toEqual({ id: 501 });
  });

  it('UT_F09_18 - Xác minh NotFoundError khi review order không tồn tại', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue(null);

    await expect(
      reviewUc.execute({ userId: 1, orderId: 999, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_19 - Xác minh review order của người dùng khác bị chặn', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 2, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ForbiddenError);
  });

  it('UT_F09_20 - Xác minh mã lỗi đúng cho ValidationError và NotFoundError', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F09_21 - Xác minh danh sách rỗng thì totalPages bằng 0', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const result = await uc.execute({ userId: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(0);
  });

  it('UT_F09_22 - Xác minh page bằng 0 dùng mặc định page 1 theo source hiện tại', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 1, page: 0, limit: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 5 }));
  });

  it('UT_F09_23 - Xác minh limit bằng 0 dùng mặc định limit 10', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 1, page: 2, limit: 0 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 10, limit: 10 }));
  });

  it('UT_F09_24 - Xác minh ValidationError khi rating thấp hơn 1', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 0, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_25 - Xác minh ValidationError khi rating là số thập phân', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 4.5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_26 - Xác minh ValidationError khi review không có nội dung', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5 })
    ).rejects.toThrow(ValidationError);
    expect(reviewRepo.create).not.toHaveBeenCalled();
  });

  it('UT_F09_27 - Xác minh ValidationError khi có file .exe trong danh sách ảnh', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['a.jpg', 'virus.exe'] })
    ).rejects.toThrow(ValidationError);
    expect(imageRepo.bulkCreate).not.toHaveBeenCalled();
  });

  it('UT_F09_28 - Xác minh review có ảnh jpg hợp lệ được lưu image', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['a.jpg'] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([{ review_id: 501, image_url: 'a.jpg' }]);
  });

  it('UT_F09_29 - Xác minh có cấu hình tourRepo nhưng tour không tồn tại thì báo lỗi', async () => {
    const reviewRepo = makeReviewRepo();
    const userRepo = makeUserRepo();
    const tourRepo = makeTourRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, undefined, userRepo, tourRepo);
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_30 - Xác minh có cấu hình userRepo nhưng user không tồn tại thì báo lỗi', async () => {
    const reviewRepo = makeReviewRepo();
    const userRepo = makeUserRepo();
    const tourRepo = makeTourRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, undefined, userRepo, tourRepo);
    tourRepo.findByPk.mockResolvedValue({ id: 9 });
    userRepo.findByPk.mockResolvedValue(null);

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_31 - Xác minh ValidationError khi update is_review trả về 0', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    orderRepo.update.mockResolvedValue([0]);
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_32 - Xác minh update is_review trả về số nguyên vẫn được xem là thành công', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    orderRepo.update.mockResolvedValue(1 as any);
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).resolves.toEqual({ id: 501 });
  });
});

