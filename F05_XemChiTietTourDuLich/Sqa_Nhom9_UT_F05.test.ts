/**
 * @file Sqa_Nhom9_UT_F05.test.ts
 * @module F05_XemChiTietTourDuLich
 * @description Unit tests for GetTourByIdUseCase - F05: Xem chi tiết tour du lịch
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Xem chi tiết tour thành công
 *  - Tour không tồn tại
 *  - ID không hợp lệ (âm, =0)
 *  - Tour không có hướng dẫn viên
 *  - Tour đã xóa
 *  - Tour có nhiều hình ảnh
 *  - Tour không có lịch trình
 *  - ID lớn
 *  - Xác minh include Guide được gọi
 *  - Giá tour = 0
 *  - Tour hết hạn
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  GetTourByIdUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ITourRepository,
} from './F05.src';

// =====================================================================
// HELPERS – factory functions for mock repository
// =====================================================================
const makeTourRepo = (): jest.Mocked<ITourRepository> => {
  return {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  } as any;
};

// =====================================================================
// TEST SUITE
// =====================================================================
describe('F05 - Xem chi tiết tour du lịch | GetTourByIdUseCase', () => {
  let repo: jest.Mocked<ITourRepository>;
  let uc: GetTourByIdUseCase;

  beforeEach(() => {
    repo = makeTourRepo();
    uc = new GetTourByIdUseCase(repo);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_01
  // -------------------------------------------------------------------
  it('UT_F05_01 – Xem chi tiết tour thành công', async () => {
    /**
     * Test Case ID : UT_F05_01
     * Test Objective: Xác minh lấy chi tiết tour hợp lệ
     * Input         : tourId=1
     * Expected Output: { id:1, title:'Tour Đà Lạt', guide:{name:'A'} }
     * Notes         : CheckDB – findByPk() được gọi với include:['Guide']
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Đà Lạt', guide: { name: 'A' } });

    const result = await uc.execute({ tourId: 1 });

    expect(result.title).toBe('Tour Đà Lạt');
    expect(repo.findByPk).toHaveBeenCalledWith(1, { include: ['Guide'] });
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_02
  // -------------------------------------------------------------------
  it('UT_F05_02 – Tour không tồn tại', async () => {
    /**
     * Test Case ID : UT_F05_02
     * Test Objective: Xác minh NotFoundError khi tourId không có trong DB
     * Input         : tourId=999
     * Expected Output: NotFoundError "Tour không tồn tại"
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ tourId: 999 })).rejects.toThrow(NotFoundError);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_03
  // -------------------------------------------------------------------
  it('UT_F05_03 – ID tour âm', async () => {
    /**
     * Test Case ID : UT_F05_03
     * Test Objective: Xác minh ValidationError khi tourId <= 0
     * Input         : tourId=-1
     * Expected Output: ValidationError "ID tour không hợp lệ"
     * Notes         : Không query DB
     */
    await expect(uc.execute({ tourId: -1 })).rejects.toThrow(ValidationError);
    expect(repo.findByPk).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_04
  // -------------------------------------------------------------------
  it('UT_F05_04 – Tour không có hướng dẫn viên', async () => {
    /**
     * Test Case ID : UT_F05_04
     * Test Objective: Xác minh tour không có guide vẫn trả về (guide=null)
     * Input         : tour có guide=null
     * Expected Output: result.guide=null
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Tự Do', guide: null });

    const result = await uc.execute({ tourId: 1 });

    expect(result.guide).toBeNull();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_05
  // -------------------------------------------------------------------
  it('UT_F05_05 – ID tour = 0', async () => {
    /**
     * Test Case ID : UT_F05_05
     * Test Objective: Xác minh ValidationError khi tourId=0
     * Input         : tourId=0
     * Expected Output: ValidationError "ID tour không hợp lệ"
     */
    await expect(uc.execute({ tourId: 0 })).rejects.toThrow(ValidationError);
    expect(repo.findByPk).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_06
  // -------------------------------------------------------------------
  it('UT_F05_06 – Tour đã bị xóa (soft delete)', async () => {
    /**
     * Test Case ID : UT_F05_06
     * Test Objective: Xác minh vẫn trả về tour đã xóa (deleted_at có giá trị)
     * Input         : tour có deleted_at='2024-01-01'
     * Expected Output: Vẫn trả về tour (không lỗi)
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Cũ', deleted_at: '2024-01-01' });

    const result = await uc.execute({ tourId: 1 });

    expect(result.title).toBe('Tour Cũ');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_07
  // -------------------------------------------------------------------
  it('UT_F05_07 – Tour có nhiều hình ảnh', async () => {
    /**
     * Test Case ID : UT_F05_07
     * Test Objective: Xác minh tour có mảng images đầy đủ
     * Input         : tour có images=['a.jpg','b.jpg']
     * Expected Output: result.images.length=2
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Ảnh', images: ['a.jpg', 'b.jpg'] });

    const result = await uc.execute({ tourId: 1 });

    expect(result.images.length).toBe(2);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_08
  // -------------------------------------------------------------------
  it('UT_F05_08 – Tour không có lịch trình', async () => {
    /**
     * Test Case ID : UT_F05_08
     * Test Objective: Xác minh tour có schedules=[]
     * Input         : tour có schedules=[]
     * Expected Output: result.schedules.length=0
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Trống', schedules: [] });

    const result = await uc.execute({ tourId: 1 });

    expect(result.schedules.length).toBe(0);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_09
  // -------------------------------------------------------------------
  it('UT_F05_09 – ID tour lớn (999999)', async () => {
    /**
     * Test Case ID : UT_F05_09
     * Test Objective: Xác minh tour với ID lớn vẫn query được
     * Input         : tourId=999999
     * Expected Output: result.id=999999
     */
    repo.findByPk.mockResolvedValue({ id: 999999, title: 'Tour Big' });

    const result = await uc.execute({ tourId: 999999 });

    expect(result.id).toBe(999999);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_10
  // -------------------------------------------------------------------
  it('UT_F05_10 – findByPk() được gọi với include Guide', async () => {
    /**
     * Test Case ID : UT_F05_10
     * Test Objective: Xác minh query có include Guide để lấy thông tin HDV
     * Input         : tourId=1
     * Expected Output: findByPk(1, { include:['Guide'] })
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await uc.execute({ tourId: 1 });

    expect(repo.findByPk).toHaveBeenCalledWith(1, { include: ['Guide'] });
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_11
  // -------------------------------------------------------------------
  it('UT_F05_11 – Tour có giá = 0', async () => {
    /**
     * Test Case ID : UT_F05_11
     * Test Objective: Xác minh tour miễn phí (price=0) vẫn trả về
     * Input         : price=0
     * Expected Output: result.price=0
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Free', price: 0 });

    const result = await uc.execute({ tourId: 1 });

    expect(result.price).toBe(0);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_12
  // -------------------------------------------------------------------
  it('UT_F05_12 – Tour đã hết hạn', async () => {
    /**
     * Test Case ID : UT_F05_12
     * Test Objective: Xác minh tour đã hết hạn vẫn trả về (không validation ngày)
     * Input         : end_date='2020-01-01'
     * Expected Output: Vẫn trả về tour
     */
    repo.findByPk.mockResolvedValue({ id: 1, title: 'Tour Hết Hạn', end_date: '2020-01-01' });

    const result = await uc.execute({ tourId: 1 });

    expect(result.title).toBe('Tour Hết Hạn');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_13
  // -------------------------------------------------------------------
  it('UT_F05_13 – Tour có lịch trình đầy đủ', async () => {
    /**
     * Test Case ID : UT_F05_13
     * Test Objective: Xác minh tour có schedules nhiều ngày
     * Input         : schedules=[{day:1},{day:2},{day:3}]
     * Expected Output: result.schedules.length=3
     */
    repo.findByPk.mockResolvedValue({
      id: 1,
      title: 'Tour 3 ngày',
      schedules: [{ day: 1 }, { day: 2 }, { day: 3 }],
    });

    const result = await uc.execute({ tourId: 1 });

    expect(result.schedules.length).toBe(3);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_14
  // -------------------------------------------------------------------
  it('UT_F05_14 – Tour có includes và excludes', async () => {
    /**
     * Test Case ID : UT_F05_14
     * Test Objective: Xác minh tour có dịch vụ bao gồm/không bao gồm
     * Input         : includes=['Bữa sáng'], excludes=['Vé cáp treo']
     * Expected Output: result.includes và result.excludes đúng
     */
    repo.findByPk.mockResolvedValue({
      id: 1,
      includes: ['Bữa sáng'],
      excludes: ['Vé cáp treo'],
    });

    const result = await uc.execute({ tourId: 1 });

    expect(result.includes).toContain('Bữa sáng');
    expect(result.excludes).toContain('Vé cáp treo');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_15
  // -------------------------------------------------------------------
  it('UT_F05_15 – Tour có rating và total_reviews', async () => {
    /**
     * Test Case ID : UT_F05_15
     * Test Objective: Xác minh tour có thông tin đánh giá
     * Input         : rating=4.5, total_reviews=120
     * Expected Output: result.rating=4.5, result.total_reviews=120
     */
    repo.findByPk.mockResolvedValue({ id: 1, rating: 4.5, total_reviews: 120 });

    const result = await uc.execute({ tourId: 1 });

    expect(result.rating).toBe(4.5);
    expect(result.total_reviews).toBe(120);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_16
  // -------------------------------------------------------------------
  it('UT_F05_16 – Tour có capacity và tickets_sold', async () => {
    /**
     * Test Case ID : UT_F05_16
     * Test Objective: Xác minh tour có thông tin sức chứa và vé đã bán
     * Input         : capacity=30, tickets_sold=25
     * Expected Output: result.capacity=30, result.tickets_sold=25
     */
    repo.findByPk.mockResolvedValue({ id: 1, capacity: 30, tickets_sold: 25 });

    const result = await uc.execute({ tourId: 1 });

    expect(result.capacity).toBe(30);
    expect(result.tickets_sold).toBe(25);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_17
  // -------------------------------------------------------------------
  it('UT_F05_17 – Tour có thông tin departure và destination', async () => {
    /**
     * Test Case ID : UT_F05_17
     * Test Objective: Xác minh tour có điểm khởi hành và điểm đến
     * Input         : departure='Hà Nội', destination='Hạ Long'
     * Expected Output: result.departure='Hà Nội', result.destination='Hạ Long'
     */
    repo.findByPk.mockResolvedValue({ id: 1, departure: 'Hà Nội', destination: 'Hạ Long' });

    const result = await uc.execute({ tourId: 1 });

    expect(result.departure).toBe('Hà Nội');
    expect(result.destination).toBe('Hạ Long');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_18
  // -------------------------------------------------------------------
  it('UT_F05_18 – findByPk() được gọi đúng 1 lần', async () => {
    /**
     * Test Case ID : UT_F05_18
     * Test Objective: Xác minh không có vòng lặp query
     * Input         : tourId=1
     * Expected Output: findByPk() đúng 1 lần
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await uc.execute({ tourId: 1 });

    expect(repo.findByPk).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_19
  // -------------------------------------------------------------------
  it('UT_F05_19 – Tour có start_date và end_date', async () => {
    /**
     * Test Case ID : UT_F05_19
     * Test Objective: Xác minh tour có ngày bắt đầu và kết thúc
     * Input         : start_date='2024-06-01', end_date='2024-06-03'
     * Expected Output: result.start_date và result.end_date đúng
     */
    repo.findByPk.mockResolvedValue({
      id: 1,
      start_date: '2024-06-01',
      end_date: '2024-06-03',
    });

    const result = await uc.execute({ tourId: 1 });

    expect(result.start_date).toBe('2024-06-01');
    expect(result.end_date).toBe('2024-06-03');
  });

  // -------------------------------------------------------------------
  // Test Case UT_F05_20
  // -------------------------------------------------------------------
  it('UT_F05_20 – Tour có main_image', async () => {
    /**
     * Test Case ID : UT_F05_20
     * Test Objective: Xác minh tour có ảnh chính
     * Input         : main_image='https://cdn.example.com/tour.jpg'
     * Expected Output: result.main_image đúng URL
     */
    repo.findByPk.mockResolvedValue({
      id: 1,
      main_image: 'https://cdn.example.com/tour.jpg',
    });

    const result = await uc.execute({ tourId: 1 });

    expect(result.main_image).toBe('https://cdn.example.com/tour.jpg');
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F05_21 – GetTourByIdUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(GetTourByIdUseCase); });
  it('UT_F05_22 – GetTourByIdUseCase có prototype hợp lệ', () => { expect(GetTourByIdUseCase.prototype).toBeDefined(); });
  it('UT_F05_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
});
