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

describe('F09 - Xem va quan ly don hang da dat', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: GetUserOrdersUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    uc = new GetUserOrdersUseCase(orderRepo);
  });

  it('UT_F09_01 - Lay danh sach don hang theo user_id', async () => {
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

  it('UT_F09_02 - Dung page va limit mac dinh khi khong truyen', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 0 }));
  });

  it('UT_F09_03 - Tinh offset dung khi page=3 limit=5', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 11 });

    const result = await uc.execute({ userId: 1, page: 3, limit: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 }));
    expect(result.pagination.totalPages).toBe(3);
  });

  it('UT_F09_04 - Lay chi tiet don hang thanh cong', async () => {
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    const result = await uc.getOrderDetail({ userId: 1, orderId: 101 });

    expect(result.id).toBe(101);
    expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 101 } });
  });

  it('UT_F09_05 - Don hang khong ton tai tra NotFoundError', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(uc.getOrderDetail({ userId: 1, orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_06 - Khong duoc xem don hang cua user khac', async () => {
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 2 });

    await expect(uc.getOrderDetail({ userId: 1, orderId: 101 })).rejects.toThrow(ForbiddenError);
  });

  it('UT_F09_07 - Trang thai pending/confirmed/cancelled van duoc tra ve trong danh sach', async () => {
    const rows = [{ status: 'pending' }, { status: 'confirmed' }, { status: 'cancelled' }];
    orderRepo.findAndCountAll.mockResolvedValue({ rows, count: rows.length });

    const result = await uc.execute({ userId: 1 });

    expect(result.orders.map((order) => order.status)).toEqual(['pending', 'confirmed', 'cancelled']);
  });

  it('UT_F09_08 - Review chi chap nhan order status completed theo source that', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'confirmed' });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_09 - Review noi dung khoang trang tao review khong co text theo unit contract', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: '   ' })
    ).resolves.toEqual({ id: 501 });
    expect(reviewRepo.create).toHaveBeenCalledWith({
      user_id: 1,
      tour_id: 9,
      rating: 5,
    });
  });

  it('UT_F09_10 - Review hop le duoc trim text va danh dau order da review', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 4, text: '  Tour tot  ' });

    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 1, tour_id: 9, rating: 4, text: 'Tour tot' }));
    expect(orderRepo.update).toHaveBeenCalledWith({ is_review: true }, { where: { id: 101 } });
  });

  it('UT_F09_11 - File khong phai anh van duoc dua vao reviewImageRepo theo unit contract', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['review.pdf'] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([{ review_id: 501, image_url: 'review.pdf' }]);
  });

  it('UT_F09_12 - Khong cho review lai don hang da review', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: true });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_13 - Rating ngoai khoang 1 den 5 bi tu choi', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 6, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_14 - Review bi chan khi order khong thuoc tour', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 8, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_15 - Review voi comment thay vi text van duoc luu', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, comment: '  Rat tot  ' });

    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 1, tour_id: 9, rating: 5, text: 'Rat tot' }));
  });

  it('UT_F09_16 - Review bo qua image rong trong danh sach images', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['', ' a.png '] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([{ review_id: 501, image_url: 'a.png' }]);
  });

  it('UT_F09_17 - Review khong co imageRepo van thanh cong neu co images', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['x.png'] })
    ).resolves.toEqual({ id: 501 });
  });

  it('UT_F09_18 - Review order khong ton tai tra NotFoundError', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue(null);

    await expect(
      reviewUc.execute({ userId: 1, orderId: 999, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_19 - Review order cua user khac bi chan', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 2, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ForbiddenError);
  });

  it('UT_F09_20 - Ma loi dung cho ValidationError va NotFoundError', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
  });

  it('UT_F09_21 - Danh sach rong tinh totalPages bang 0', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const result = await uc.execute({ userId: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(0);
  });

  it('UT_F09_22 - Page bang 0 dung default page 1 nhu source mock', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 1, page: 0, limit: 5 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 5 }));
  });

  it('UT_F09_23 - Limit bang 0 dung default limit 10', async () => {
    orderRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ userId: 1, page: 2, limit: 0 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ offset: 10, limit: 10 }));
  });

  it('UT_F09_24 - Review rating thap hon 1 bi tu choi', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 0, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_25 - Review rating thap phan bi tu choi', async () => {
    const reviewUc = new ReviewTourUseCase(orderRepo, makeReviewRepo());
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 4.5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_26 - Review khong co noi dung van tao duoc theo source hien tai', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5 })
    ).resolves.toEqual({ id: 501 });
  });

  it('UT_F09_27 - File exe trong danh sach anh van duoc dua vao image repo theo source hien tai', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['a.jpg', 'virus.exe'] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([
      { review_id: 501, image_url: 'a.jpg' },
      { review_id: 501, image_url: 'virus.exe' },
    ]);
  });

  it('UT_F09_28 - Review co anh jpg hop le duoc luu image', async () => {
    const reviewRepo = makeReviewRepo();
    const imageRepo = makeImageRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, imageRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot', images: ['a.jpg'] });

    expect(imageRepo.bulkCreate).toHaveBeenCalledWith([{ review_id: 501, image_url: 'a.jpg' }]);
  });

  it('UT_F09_29 - Co cau hinh tourRepo nhung tour khong ton tai thi bao loi', async () => {
    const reviewRepo = makeReviewRepo();
    const userRepo = makeUserRepo();
    const tourRepo = makeTourRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo, undefined, userRepo, tourRepo);
    tourRepo.findByPk.mockResolvedValue(null);

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(NotFoundError);
  });

  it('UT_F09_30 - Co cau hinh userRepo nhung user khong ton tai thi bao loi', async () => {
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

  it('UT_F09_31 - update is_review tra ve 0 thi bao loi', async () => {
    const reviewRepo = makeReviewRepo();
    const reviewUc = new ReviewTourUseCase(orderRepo, reviewRepo);
    orderRepo.findOne.mockResolvedValue({ id: 101, user_id: 1, tour_id: 9, status: 'completed', is_review: false });
    orderRepo.update.mockResolvedValue([0]);
    reviewRepo.create.mockResolvedValue({ id: 501 });

    await expect(
      reviewUc.execute({ userId: 1, orderId: 101, tourId: 9, rating: 5, text: 'Tot' })
    ).rejects.toThrow(ValidationError);
  });

  it('UT_F09_32 - update is_review tra ve so nguyen van duoc xem la thanh cong', async () => {
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

