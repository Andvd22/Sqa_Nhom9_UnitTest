/**
 * @file Sqa_Nhom9_UT_F20.test.ts
 * @module F20_QuanLyPhanCongHuongDanVien
 * @description Unit tests for GuideAssignmentUseCase - F20: Quản lý phân công hướng dẫn viên
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Phân công HDV thành công
 *  - HDV không tồn tại
 *  - HDV không phải role guide
 *  - Tour không tồn tại
 *  - Ngày kết thúc <= ngày bắt đầu
 *  - Trùng lịch (overlap)
 *  - Gỡ HDV thành công
 *  - Gỡ HDV không tồn tại
 *  - Lấy lịch HDV thành công
 *  - Lịch HDV phân trang
 *  - findByPk guide đúng 1 lần
 *  - findByPk tour đúng 1 lần
 *  - findOne overlap đúng 1 lần
 *  - create assignment đúng 1 lần
 *  - findOne assignment đúng 1 lần (remove)
 *  - update removed_at đúng 1 lần (remove)
 *  - findAndCountAll schedule đúng 1 lần
 *  - Ngày start = end (invalid)
 *  - Phân công tour đã có HDV khác (không overlap)
 *  - Lịch HDV rỗng
 */

import {
  GuideAssignmentUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  IUserRepository,
  ITourRepository,
  IAssignmentRepository,
} from './F20.src';

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeTourRepo(): jest.Mocked<ITourRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeAssignRepo(): jest.Mocked<IAssignmentRepository> {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  } as any;
}

describe('F20 – Quản lý phân công HDV | GuideAssignmentUseCase', () => {
  let userRepo: jest.Mocked<IUserRepository>;
  let tourRepo: jest.Mocked<ITourRepository>;
  let assignRepo: jest.Mocked<IAssignmentRepository>;
  let uc: GuideAssignmentUseCase;

  beforeEach(() => {
    userRepo = makeUserRepo();
    tourRepo = makeTourRepo();
    assignRepo = makeAssignRepo();
    uc = new GuideAssignmentUseCase(userRepo, tourRepo, assignRepo);
  });

  // UT_F20_01
  it('UT_F20_01 – Phân công HDV thành công', async () => {
    /**
     * Test Case ID : UT_F20_01
     * Test Objective: Xác minh phân công HDV vào tour
     * Input         : tourId=10, guideId=5, startDate=Date+3, endDate=Date+5
     * Expected Output: assignment object
     * Notes         : CheckDB – create() được gọi với tour_id, guide_id
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 100 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    const result = await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(result.id).toBe(100);
    expect(assignRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tour_id: 10, guide_id: 5 })
    );
  });

  // UT_F20_02
  it('UT_F20_02 – HDV không tồn tại', async () => {
    /**
     * Test Case ID : UT_F20_02
     * Test Objective: Xác minh NotFoundError khi guideId không có
     * Input         : guideId=999
     * Expected Output: NotFoundError "Hướng dẫn viên không tồn tại"
     * Notes         : Không gọi tourRepo, assignRepo
     */
    userRepo.findByPk.mockResolvedValue(null);

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await expect(
      uc.assignGuide({ tourId: 10, guideId: 999, startDate: start, endDate: end })
    ).rejects.toThrow(NotFoundError);

    expect(tourRepo.findByPk).not.toHaveBeenCalled();
    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_03
  it('UT_F20_03 – HDV không phải role guide', async () => {
    /**
     * Test Case ID : UT_F20_03
     * Test Objective: Xác minh NotFoundError khi user role != 'guide'
     * Input         : role='admin'
     * Expected Output: NotFoundError "Hướng dẫn viên không tồn tại"
     * Notes         : Không gọi assignRepo.create
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'admin' });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await expect(
      uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end })
    ).rejects.toThrow(NotFoundError);

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_04
  it('UT_F20_04 – Tour không tồn tại', async () => {
    /**
     * Test Case ID : UT_F20_04
     * Test Objective: Xác minh NotFoundError khi tourId không có
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     * Notes         : Guide tìm thấy, tour không có
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue(null);

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await expect(
      uc.assignGuide({ tourId: 999, guideId: 5, startDate: start, endDate: end })
    ).rejects.toThrow(NotFoundError);

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_05
  it('UT_F20_05 – Ngày kết thúc <= ngày bắt đầu', async () => {
    /**
     * Test Case ID : UT_F20_05
     * Test Objective: Xác minh ValidationError khi endDate <= startDate
     * Input         : startDate=Date+5, endDate=Date+3
     * Expected Output: ValidationError "Ngày kết thúc phải sau ngày bắt đầu"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });

    const start = new Date(); start.setDate(start.getDate() + 5);
    const end = new Date(); end.setDate(end.getDate() + 3);
    await expect(
      uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end })
    ).rejects.toThrow(ValidationError);

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_06
  it('UT_F20_06 – Trùng lịch (overlap)', async () => {
    /**
     * Test Case ID : UT_F20_06
     * Test Objective: Xác minh ConflictError khi HDV đã có lịch overlap
     * Input         : guideId=5 đã có assignment trong khoảng ngày
     * Expected Output: ConflictError "Hướng dẫn viên đã có lịch trong khoảng này"
     * Notes         : Không create
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue({ id: 50, guide_id: 5 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await expect(
      uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end })
    ).rejects.toThrow(ConflictError);

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_07
  it('UT_F20_07 – Gỡ HDV thành công', async () => {
    /**
     * Test Case ID : UT_F20_07
     * Test Objective: Xác minh gỡ HDV khỏi tour
     * Input         : tourId=10 có assignment
     * Expected Output: { message: 'Gỡ HDV thành công' }
     * Notes         : CheckDB – update() với removed_at
     */
    assignRepo.findOne.mockResolvedValue({ id: 100, tour_id: 10 });
    assignRepo.update.mockResolvedValue([1]);

    const result = await uc.removeGuide(10);

    expect(result.message).toBe('Gỡ HDV thành công');
    expect(assignRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ removed_at: expect.any(Date) }),
      expect.objectContaining({ where: { id: 100 } })
    );
  });

  // UT_F20_08
  it('UT_F20_08 – Gỡ HDV không tồn tại', async () => {
    /**
     * Test Case ID : UT_F20_08
     * Test Objective: Xác minh NotFoundError khi tour không có assignment
     * Input         : tourId=999
     * Expected Output: NotFoundError "Phân công không tồn tại"
     * Notes         : Không update
     */
    assignRepo.findOne.mockResolvedValue(null);

    await expect(uc.removeGuide(999)).rejects.toThrow(NotFoundError);

    expect(assignRepo.update).not.toHaveBeenCalled();
  });

  // UT_F20_09
  it('UT_F20_09 – Lấy lịch HDV thành công', async () => {
    /**
     * Test Case ID : UT_F20_09
     * Test Objective: Xác minh lấy lịch phân công của HDV
     * Input         : guideId=5
     * Expected Output: { assignments: [...], pagination: {...} }
     * Notes         : CheckDB – findAndCountAll với guide_id=5
     */
    const rows = [
      { id: 1, tour_id: 10 },
      { id: 2, tour_id: 11 },
    ];
    assignRepo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.getGuideSchedule({ guideId: 5 });

    expect(result.assignments).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(assignRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { guide_id: 5 } })
    );
  });

  // UT_F20_10
  it('UT_F20_10 – Lịch HDV phân trang', async () => {
    /**
     * Test Case ID : UT_F20_10
     * Test Objective: Xác minh phân trang lịch HDV
     * Input         : page=2, limit=5
     * Expected Output: offset=5
     */
    assignRepo.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });

    await uc.getGuideSchedule({ guideId: 5, page: 2, limit: 5 });

    expect(assignRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 5 })
    );
  });

  // UT_F20_11
  it('UT_F20_11 – findByPk guide đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F20_11
     * Test Objective: Xác minh không query guide nhiều lần
     * Input         : guideId=5
     * Expected Output: findByPk(5) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 100 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(userRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(userRepo.findByPk).toHaveBeenCalledWith(5);
  });

  // UT_F20_12
  it('UT_F20_12 – findByPk tour đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F20_12
     * Test Objective: Xác minh không query tour nhiều lần
     * Input         : tourId=10
     * Expected Output: findByPk(10) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 100 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(tourRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(tourRepo.findByPk).toHaveBeenCalledWith(10);
  });

  // UT_F20_13
  it('UT_F20_13 – findOne overlap đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F20_13
     * Test Objective: Xác minh check overlap đúng 1 lần
     * Input         : guideId=5
     * Expected Output: findOne({where:{guide_id:5,...}}) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 100 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(assignRepo.findOne).toHaveBeenCalledTimes(1);
  });

  // UT_F20_14
  it('UT_F20_14 – create assignment đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F20_14
     * Test Objective: Xác minh không có vòng lặp/retry create
     * Input         : tourId=10, guideId=5
     * Expected Output: create() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần tạo duplicate assignment
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 100 });

    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 5);
    await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(assignRepo.create).toHaveBeenCalledTimes(1);
  });

  // UT_F20_15
  it('UT_F20_15 – findOne assignment đúng 1 lần (remove)', async () => {
    /**
     * Test Case ID : UT_F20_15
     * Test Objective: Xác minh không query assignment nhiều lần khi gỡ
     * Input         : tourId=10
     * Expected Output: findOne đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    assignRepo.findOne.mockResolvedValue({ id: 100, tour_id: 10 });
    assignRepo.update.mockResolvedValue([1]);

    await uc.removeGuide(10);

    expect(assignRepo.findOne).toHaveBeenCalledTimes(1);
    expect(assignRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tour_id: 10 } })
    );
  });

  // UT_F20_16
  it('UT_F20_16 – update removed_at đúng 1 lần (remove)', async () => {
    /**
     * Test Case ID : UT_F20_16
     * Test Objective: Xác minh không có vòng lặp/retry update
     * Input         : tourId=10
     * Expected Output: update() đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần gây lỗi dữ liệu
     */
    assignRepo.findOne.mockResolvedValue({ id: 100, tour_id: 10 });
    assignRepo.update.mockResolvedValue([1]);

    await uc.removeGuide(10);

    expect(assignRepo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F20_17
  it('UT_F20_17 – findAndCountAll schedule đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F20_17
     * Test Objective: Xác minh không query schedule nhiều lần
     * Input         : guideId=5
     * Expected Output: findAndCountAll đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    assignRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.getGuideSchedule({ guideId: 5 });

    expect(assignRepo.findAndCountAll).toHaveBeenCalledTimes(1);
  });

  // UT_F20_18
  it('UT_F20_18 – Ngày start = end (invalid)', async () => {
    /**
     * Test Case ID : UT_F20_18
     * Test Objective: Xác minh ValidationError khi startDate = endDate
     * Input         : startDate=Date+3, endDate=Date+3
     * Expected Output: ValidationError "Ngày kết thúc phải sau ngày bắt đầu"
     * Notes         : endDate <= startDate
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });

    const same = new Date(); same.setDate(same.getDate() + 3);
    await expect(
      uc.assignGuide({ tourId: 10, guideId: 5, startDate: same, endDate: same })
    ).rejects.toThrow(ValidationError);

    expect(assignRepo.create).not.toHaveBeenCalled();
  });

  // UT_F20_19
  it('UT_F20_19 – Phân công tour đã có HDV khác (không overlap)', async () => {
    /**
     * Test Case ID : UT_F20_19
     * Test Objective: Xác minh 1 tour có thể có nhiều HDV ở các thời điểm khác
     * Input         : tourId=10, guideId=5, không overlap với assignment cũ
     * Expected Output: Cập nhật thành công
     * Notes         : findOne overlap trả null
     */
    userRepo.findByPk.mockResolvedValue({ id: 5, role: 'guide' });
    tourRepo.findByPk.mockResolvedValue({ id: 10 });
    assignRepo.findOne.mockResolvedValue(null);
    assignRepo.create.mockResolvedValue({ id: 101 });

    const start = new Date(); start.setDate(start.getDate() + 10);
    const end = new Date(); end.setDate(end.getDate() + 12);
    const result = await uc.assignGuide({ tourId: 10, guideId: 5, startDate: start, endDate: end });

    expect(result.id).toBe(101);
  });

  // UT_F20_20
  it('UT_F20_20 – Lịch HDV rỗng', async () => {
    /**
     * Test Case ID : UT_F20_20
     * Test Objective: Xác minh trả về rỗng khi HDV chưa có lịch
     * Input         : guideId=99
     * Expected Output: { assignments: [], pagination: { total: 0 } }
     */
    assignRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.getGuideSchedule({ guideId: 99 });

    expect(result.assignments).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F20_21 – GuideAssignmentUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(GuideAssignmentUseCase); });
  it('UT_F20_22 – GuideAssignmentUseCase có prototype hợp lệ', () => { expect(GuideAssignmentUseCase.prototype).toBeDefined(); });
  it('UT_F20_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F20_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F20_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F20_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
});
