/**
 * @file Sqa_Nhom9_UT_F13.test.ts
 * @module F13_PhanHoiVaHoTroNguoiDung
 * @description Unit tests for FeedbackSystemUseCase - F13: Phản hồi và hỗ trợ người dùng
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Tạo feedback thành công
 *  - User không tồn tại (create)
 *  - Title rỗng
 *  - Message rỗng
 *  - Title < 5 ký tự
 *  - Trả lời feedback thành công
 *  - Feedback không tồn tại (reply)
 *  - Feedback đã đóng
 *  - Reply message rỗng
 *  - Lấy danh sách feedback
 *  - Tìm kiếm feedback
 *  - Đóng feedback thành công
 *  - Đóng feedback đã đóng
 *  - Feedback không tồn tại (close)
 *  - Phân trang feedback
 *  - createFeedback đúng status='open'
 *  - replyFeedback đúng status='replied'
 *  - closeFeedback đúng status='closed'
 *  - Title có khoảng trắng đầu/cuối được trim
 *  - createFeedback findByPk đúng 1 lần
 */

import {
  FeedbackSystemUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  IUserRepository,
  IFeedbackRepository,
} from './F13.src';

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeFbRepo(): jest.Mocked<IFeedbackRepository> {
  return {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  } as any;
}

describe('F13 – Phản hồi và hỗ trợ người dùng | FeedbackSystemUseCase', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let fbRepo: jest.Mocked<IFeedbackRepository>;
  let uc: FeedbackSystemUseCase;

  beforeEach(() => {
    userRepo = makeUserRepo();
    fbRepo = makeFbRepo();
    uc = new FeedbackSystemUseCase(userRepo, fbRepo);
  });

  // UT_F13_01
  it('UT_F13_01 – Tạo feedback thành công', async () => {
    /**
     * Test Case ID : UT_F13_01
     * Test Objective: Xác minh tạo feedback cơ bản thành công
     * Input         : userId=1, title='Tiêu đề test', message='Nội dung'
     * Expected Output: feedback object với status='open'
     * Notes         : CheckDB – create() được gọi với status='open'
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    fbRepo.create.mockResolvedValue({ id: 100, status: 'open' });

    const result = await uc.createFeedback({ userId: 1, title: 'Tiêu đề test', message: 'Nội dung' });

    expect(result.status).toBe('open');
    expect(fbRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open', user_id: 1 })
    );
  });

  // UT_F13_02
  it('UT_F13_02 – User không tồn tại (create)', async () => {
    /**
     * Test Case ID : UT_F13_02
     * Test Objective: Xác minh NotFoundError khi userId không có
     * Input         : userId=999
     * Expected Output: NotFoundError "Người dùng không tồn tại"
     * Notes         : Không gọi fbRepo.create
     */
    userRepo.findByPk.mockResolvedValue(null);

    await expect(
      uc.createFeedback({ userId: 999, title: 'Test', message: 'Test' })
    ).rejects.toThrow(NotFoundError);

    expect(fbRepo.create).not.toHaveBeenCalled();
  });

  // UT_F13_03
  it('UT_F13_03 – Title rỗng', async () => {
    /**
     * Test Case ID : UT_F13_03
     * Test Objective: Xác minh ValidationError khi title rỗng
     * Input         : title=''
     * Expected Output: ValidationError "Tiêu đề và nội dung không được để trống"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.createFeedback({ userId: 1, title: '', message: 'Nội dung' })
    ).rejects.toThrow(ValidationError);

    expect(fbRepo.create).not.toHaveBeenCalled();
  });

  // UT_F13_04
  it('UT_F13_04 – Message rỗng', async () => {
    /**
     * Test Case ID : UT_F13_04
     * Test Objective: Xác minh ValidationError khi message rỗng
     * Input         : message=''
     * Expected Output: ValidationError "Tiêu đề và nội dung không được để trống"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.createFeedback({ userId: 1, title: 'Test', message: '' })
    ).rejects.toThrow(ValidationError);

    expect(fbRepo.create).not.toHaveBeenCalled();
  });

  // UT_F13_05
  it('UT_F13_05 – Title < 5 ký tự', async () => {
    /**
     * Test Case ID : UT_F13_05
     * Test Objective: Xác minh ValidationError khi title < 5 ký tự
     * Input         : title='ABCD'
     * Expected Output: ValidationError "Tiêu đề phải có ít nhất 5 ký tự"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.createFeedback({ userId: 1, title: 'ABCD', message: 'Nội dung' })
    ).rejects.toThrow(ValidationError);

    expect(fbRepo.create).not.toHaveBeenCalled();
  });

  // UT_F13_06
  it('UT_F13_06 – Trả lời feedback thành công', async () => {
    /**
     * Test Case ID : UT_F13_06
     * Test Objective: Xác minh admin trả lời feedback thành công
     * Input         : feedbackId=100, replyMessage='Trả lời', adminId=5
     * Expected Output: update() với reply, replied_by, status='replied'
     * Notes         : CheckDB – update() được gọi đúng
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'open' });
    fbRepo.update.mockResolvedValue([1]);

    const result = await uc.replyFeedback({ feedbackId: 100, replyMessage: 'Trả lời', adminId: 5 });

    expect(fbRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ reply: 'Trả lời', replied_by: 5, status: 'replied' }),
      expect.objectContaining({ where: { id: 100 } })
    );
  });

  // UT_F13_07
  it('UT_F13_07 – Feedback không tồn tại (reply)', async () => {
    /**
     * Test Case ID : UT_F13_07
     * Test Objective: Xác minh NotFoundError khi feedbackId không có
     * Input         : feedbackId=999
     * Expected Output: NotFoundError "Feedback không tồn tại"
     * Notes         : Không update
     */
    fbRepo.findOne.mockResolvedValue(null);

    await expect(
      uc.replyFeedback({ feedbackId: 999, replyMessage: 'Test', adminId: 5 })
    ).rejects.toThrow(NotFoundError);

    expect(fbRepo.update).not.toHaveBeenCalled();
  });

  // UT_F13_08
  it('UT_F13_08 – Feedback đã đóng không thể trả lời', async () => {
    /**
     * Test Case ID : UT_F13_08
     * Test Objective: Xác minh ForbiddenError khi feedback status='closed'
     * Input         : status='closed'
     * Expected Output: ForbiddenError "Feedback đã đóng"
     * Notes         : Không update
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'closed' });

    await expect(
      uc.replyFeedback({ feedbackId: 100, replyMessage: 'Test', adminId: 5 })
    ).rejects.toThrow(ForbiddenError);

    expect(fbRepo.update).not.toHaveBeenCalled();
  });

  // UT_F13_09
  it('UT_F13_09 – Reply message rỗng', async () => {
    /**
     * Test Case ID : UT_F13_09
     * Test Objective: Xác minh ValidationError khi replyMessage rỗng
     * Input         : replyMessage=''
     * Expected Output: ValidationError "Nội dung trả lời không được để trống"
     * Notes         : Không update
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'open' });

    await expect(
      uc.replyFeedback({ feedbackId: 100, replyMessage: '', adminId: 5 })
    ).rejects.toThrow(ValidationError);

    expect(fbRepo.update).not.toHaveBeenCalled();
  });

  // UT_F13_10
  it('UT_F13_10 – Lấy danh sách feedback thành công', async () => {
    /**
     * Test Case ID : UT_F13_10
     * Test Objective: Xác minh lấy danh sách feedback phân trang
     * Input         : page=1, limit=10
     * Expected Output: { items: [...], pagination: {...} }
     * Notes         : CheckDB – findAndCountAll được gọi
     */
    const rows = [
      { id: 1, title: 'F1' },
      { id: 2, title: 'F2' },
    ];
    fbRepo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.getFeedbacks({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  // UT_F13_11
  it('UT_F13_11 – Tìm kiếm feedback theo title', async () => {
    /**
     * Test Case ID : UT_F13_11
     * Test Objective: Xác minh search theo title
     * Input         : search='bug'
     * Expected Output: where.title like '%bug%'
     */
    fbRepo.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 1, title: 'Bug report' }] });

    await uc.getFeedbacks({ search: 'bug' });

    expect(fbRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ title: expect.objectContaining({ like: '%bug%' }) }),
      })
    );
  });

  // UT_F13_12
  it('UT_F13_12 – Đóng feedback thành công', async () => {
    /**
     * Test Case ID : UT_F13_12
     * Test Objective: Xác minh đóng feedback thành công
     * Input         : feedbackId=100
     * Expected Output: update() với status='closed', closed_at
     * Notes         : CheckDB – update() được gọi
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'replied' });
    fbRepo.update.mockResolvedValue([1]);

    const result = await uc.closeFeedback({ feedbackId: 100 });

    expect(fbRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'closed' }),
      expect.objectContaining({ where: { id: 100 } })
    );
  });

  // UT_F13_13
  it('UT_F13_13 – Đóng feedback đã đóng', async () => {
    /**
     * Test Case ID : UT_F13_13
     * Test Objective: Xác minh ValidationError khi feedback đã closed
     * Input         : status='closed'
     * Expected Output: ValidationError "Feedback đã đóng"
     * Notes         : Không update
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'closed' });

    await expect(
      uc.closeFeedback({ feedbackId: 100 })
    ).rejects.toThrow(ValidationError);

    expect(fbRepo.update).not.toHaveBeenCalled();
  });

  // UT_F13_14
  it('UT_F13_14 – Feedback không tồn tại (close)', async () => {
    /**
     * Test Case ID : UT_F13_14
     * Test Objective: Xác minh NotFoundError khi close feedbackId không có
     * Input         : feedbackId=999
     * Expected Output: NotFoundError "Feedback không tồn tại"
     * Notes         : Không update
     */
    fbRepo.findOne.mockResolvedValue(null);

    await expect(
      uc.closeFeedback({ feedbackId: 999 })
    ).rejects.toThrow(NotFoundError);

    expect(fbRepo.update).not.toHaveBeenCalled();
  });

  // UT_F13_15
  it('UT_F13_15 – Phân trang feedback page=2 limit=5', async () => {
    /**
     * Test Case ID : UT_F13_15
     * Test Objective: Xác minh offset đúng khi phân trang
     * Input         : page=2, limit=5
     * Expected Output: offset=5
     */
    fbRepo.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });

    await uc.getFeedbacks({ page: 2, limit: 5 });

    expect(fbRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 5 })
    );
  });

  // UT_F13_16
  it('UT_F13_16 – createFeedback đúng status open', async () => {
    /**
     * Test Case ID : UT_F13_16
     * Test Objective: Xác minh feedback mới luôn có status='open'
     * Input         : title='Test', message='Test'
     * Expected Output: create() với status='open'
     * Notes         : CheckDB – mặc định status='open'
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    fbRepo.create.mockResolvedValue({ id: 100 });

    await uc.createFeedback({ userId: 1, title: 'Testing', message: 'Testing' });

    expect(fbRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' })
    );
  });

  // UT_F13_17
  it('UT_F13_17 – replyFeedback đúng status replied', async () => {
    /**
     * Test Case ID : UT_F13_17
     * Test Objective: Xác minh sau reply status='replied'
     * Input         : feedbackId=100
     * Expected Output: update() với status='replied'
     * Notes         : CheckDB – cập nhật status chính xác
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'open' });
    fbRepo.update.mockResolvedValue([1]);

    await uc.replyFeedback({ feedbackId: 100, replyMessage: 'OK', adminId: 5 });

    expect(fbRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'replied' }),
      expect.anything()
    );
  });

  // UT_F13_18
  it('UT_F13_18 – closeFeedback đúng status closed', async () => {
    /**
     * Test Case ID : UT_F13_18
     * Test Objective: Xác minh sau close status='closed'
     * Input         : feedbackId=100
     * Expected Output: update() với status='closed'
     * Notes         : CheckDB – cập nhật status chính xác
     */
    fbRepo.findOne.mockResolvedValue({ id: 100, status: 'replied' });
    fbRepo.update.mockResolvedValue([1]);

    await uc.closeFeedback({ feedbackId: 100 });

    expect(fbRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'closed' }),
      expect.anything()
    );
  });

  // UT_F13_19
  it('UT_F13_19 – Title có khoảng trắng đầu/cuối được trim', async () => {
    /**
     * Test Case ID : UT_F13_19
     * Test Objective: Xác minh title '  Testing  ' được trim thành 'Testing'
     * Input         : title='  Testing  ', message='  Msg  '
     * Expected Output: create() với title='Testing', message='Msg'
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    fbRepo.create.mockResolvedValue({ id: 100 });

    await uc.createFeedback({ userId: 1, title: '  Testing  ', message: '  Msg  ' });

    expect(fbRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Testing', message: 'Msg' })
    );
  });

  // UT_F13_20
  it('UT_F13_20 – createFeedback findByPk được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F13_20
     * Test Objective: Xác minh không query user nhiều lần
     * Input         : userId=1
     * Expected Output: findByPk(1) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 1 });
    fbRepo.create.mockResolvedValue({ id: 100 });

    await uc.createFeedback({ userId: 1, title: 'Testing', message: 'Testing' });

    expect(userRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(userRepo.findByPk).toHaveBeenCalledWith(1);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F13_21 – FeedbackSystemUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(FeedbackSystemUseCase); });
  it('UT_F13_22 – FeedbackSystemUseCase có prototype hợp lệ', () => { expect(FeedbackSystemUseCase.prototype).toBeDefined(); });
  it('UT_F13_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F13_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F13_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F13_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
  it('UT_F13_27 – NotFoundError giữ nguyên name', () => { const err = new NotFoundError('msg'); expect(err.name).toBe('NotFoundError'); });
});
