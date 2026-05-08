/**
 * @file Sqa_Nhom9_UT_F04.test.ts
 * @module F04_XemDanhSachVaTimKiemTourDuLich
 * @description Unit tests for GetToursUseCase - F04: Xem danh sách và tìm kiếm tour du lịch
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Xem danh sách tour thành công (phân trang)
 *  - Lọc theo danh mục (category)
 *  - Lọc theo trạng thái active/inactive
 *  - Danh mục không tồn tại
 *  - Danh sách rỗng
 *  - Phân trang tùy chỉnh
 *  - Xác minh repository được gọi đúng
 */

// =====================================================================
// IMPORT FROM SOURCE FILE (enables Jest coverage measurement)
// =====================================================================
import {
  GetToursUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ITourRepository,
  ICategoryRepository,
} from './F04.src';

// =====================================================================
// HELPERS – factory functions for mock repositories
// =====================================================================
const makeTourRepo = (): jest.Mocked<ITourRepository> => {
  return {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  } as any;
};

const makeCatRepo = (): jest.Mocked<ICategoryRepository> => {
  return {
    findByPk: jest.fn(),
  } as any;
};

// =====================================================================
// TEST SUITE
// =====================================================================
describe('F04 - Xem danh sách và tìm kiếm tour du lịch | GetToursUseCase', () => {
  let tourRepo: jest.Mocked<ITourRepository>;
  let catRepo: jest.Mocked<ICategoryRepository>;
  let uc: GetToursUseCase;

  beforeEach(() => {
    tourRepo = makeTourRepo();
    catRepo = makeCatRepo();
    uc = new GetToursUseCase(tourRepo, catRepo);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_01
  // -------------------------------------------------------------------
  it('UT_F04_01 – Xem danh sách tour thành công (mặc định page=1, limit=10)', async () => {
    /**
     * Test Case ID : UT_F04_01
     * Test Objective: Xác minh lấy danh sách tour mặc định thành công
     * Input         : không truyền page/limit
     * Expected Output: { tours: [...], pagination: { page: 1, limit: 10, total, totalPages } }
     * Notes         : CheckDB – findAndCountAll() được gọi với page=1, limit=10
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 1, title: 'Tour A' }], count: 1 });

    const result = await uc.execute({});

    expect(result.tours).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_02
  // -------------------------------------------------------------------
  it('UT_F04_02 – Lọc tour theo danh mục (categoryId) thành công', async () => {
    /**
     * Test Case ID : UT_F04_02
     * Test Objective: Xác minh lọc tour theo danh mục hợp lệ
     * Input         : categoryId=1
     * Expected Output: Chỉ trả về tour thuộc danh mục đó
     * Notes         : CheckDB – catRepo.findByPk() kiểm tra danh mục tồn tại
     */
    catRepo.findByPk.mockResolvedValue({ id: 1, name: 'Miền Bắc' });
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 1, title: 'Tour Hạ Long' }], count: 1 });

    const result = await uc.execute({ categoryId: 1 });

    expect(result.tours).toHaveLength(1);
    expect(catRepo.findByPk).toHaveBeenCalledWith(1);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category_id: 1 }) })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_03
  // -------------------------------------------------------------------
  it('UT_F04_03 – Lọc thất bại khi danh mục không tồn tại', async () => {
    /**
     * Test Case ID : UT_F04_03
     * Test Objective: Xác minh NotFoundError khi categoryId không có trong DB
     * Input         : categoryId=999
     * Expected Output: NotFoundError "Danh mục không tồn tại"
     * Notes         : CheckDB – findAndCountAll() KHÔNG được gọi
     */
    catRepo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ categoryId: 999 })).rejects.toThrow(NotFoundError);

    expect(tourRepo.findAndCountAll).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_04
  // -------------------------------------------------------------------
  it('UT_F04_04 – Lọc tour chỉ active (isActive=true)', async () => {
    /**
     * Test Case ID : UT_F04_04
     * Test Objective: Xác minh lọc chỉ tour đang active
     * Input         : isActive=true
     * Expected Output: where.is_active=true trong query
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 1, is_active: true }], count: 1 });

    const result = await uc.execute({ isActive: true });

    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: true }) })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_05
  // -------------------------------------------------------------------
  it('UT_F04_05 – Lọc tour chỉ inactive (isActive=false)', async () => {
    /**
     * Test Case ID : UT_F04_05
     * Test Objective: Xác minh lọc tour đã bị vô hiệu hóa
     * Input         : isActive=false
     * Expected Output: where.is_active=false trong query
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 1, is_active: false }], count: 1 });

    const result = await uc.execute({ isActive: false });

    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: false }) })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_06
  // -------------------------------------------------------------------
  it('UT_F04_06 – Danh sách rỗng khi không có tour nào', async () => {
    /**
     * Test Case ID : UT_F04_06
     * Test Objective: Xác minh hệ thống trả về mảng rỗng (không lỗi)
     * Input         : Không có tour trong DB
     * Expected Output: result.tours = [], totalPages=0
     * Notes         : Không được ném lỗi; danh sách rỗng là trường hợp bình thường
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const result = await uc.execute({});

    expect(result.tours).toHaveLength(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_07
  // -------------------------------------------------------------------
  it('UT_F04_07 – Phân trang trang 2 (page=2, limit=5)', async () => {
    /**
     * Test Case ID : UT_F04_07
     * Test Objective: Xác minh offset đúng khi chuyển trang
     * Input         : page=2, limit=5
     * Expected Output: offset=5 (vì (2-1)*5=5)
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 6 }], count: 6 });

    const result = await uc.execute({ page: 2, limit: 5 });

    expect(result.pagination.page).toBe(2);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 5, limit: 5 })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_08
  // -------------------------------------------------------------------
  it('UT_F04_08 – Phân trang tùy chỉnh (page=3, limit=20)', async () => {
    /**
     * Test Case ID : UT_F04_08
     * Test Objective: Xác minh phân trang tùy chỉnh hoạt động
     * Input         : page=3, limit=20
     * Expected Output: offset=40
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 100 });

    const result = await uc.execute({ page: 3, limit: 20 });

    expect(result.pagination.page).toBe(3);
    expect(result.pagination.limit).toBe(20);
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 40 })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_09
  // -------------------------------------------------------------------
  it('UT_F04_09 – Tổng số trang được tính đúng (totalPages)', async () => {
    /**
     * Test Case ID : UT_F04_09
     * Test Objective: Xác minh totalPages = ceil(total/limit)
     * Input         : count=25, limit=10
     * Expected Output: totalPages=3
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 25 });

    const result = await uc.execute({ limit: 10 });

    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_10
  // -------------------------------------------------------------------
  it('UT_F04_10 – findAndCountAll() được gọi đúng 1 lần mỗi request', async () => {
    /**
     * Test Case ID : UT_F04_10
     * Test Objective: Xác minh không có vòng lặp/retry query
     * Input         : Bất kỳ request hợp lệ
     * Expected Output: findAndCountAll() được gọi đúng 1 lần
     * Notes         : Rollback – gọi nhiều lần sẽ tốn tài nguyên DB
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({});

    expect(tourRepo.findAndCountAll).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_11
  // -------------------------------------------------------------------
  it('UT_F04_11 – Kết quả trả về nhiều tour (đúng số lượng)', async () => {
    /**
     * Test Case ID : UT_F04_11
     * Test Objective: Xác minh hệ thống trả về toàn bộ danh sách tour đúng số lượng
     * Input         : Repository trả về 5 tours
     * Expected Output: result.tours có đúng 5 phần tử
     */
    const tours = [
      { id: 1, title: 'Tour A' },
      { id: 2, title: 'Tour B' },
      { id: 3, title: 'Tour C' },
      { id: 4, title: 'Tour D' },
      { id: 5, title: 'Tour E' },
    ];
    tourRepo.findAndCountAll.mockResolvedValue({ rows: tours, count: 5 });

    const result = await uc.execute({});

    expect(result.tours).toHaveLength(5);
    expect(result.pagination.total).toBe(5);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_12
  // -------------------------------------------------------------------
  it('UT_F04_12 – Order by created_at DESC mặc định', async () => {
    /**
     * Test Case ID : UT_F04_12
     * Test Objective: Xác minh tour được sắp xếp theo thời gian tạo mới nhất
     * Input         : Không truyền sort
     * Expected Output: order=[['created_at','DESC']]
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({});

    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['created_at', 'DESC']] })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_13
  // -------------------------------------------------------------------
  it('UT_F04_13 – Kết hợp lọc category + isActive', async () => {
    /**
     * Test Case ID : UT_F04_13
     * Test Objective: Xác minh lọc kết hợp nhiều điều kiện
     * Input         : categoryId=1, isActive=true
     * Expected Output: where={ category_id:1, is_active:true }
     */
    catRepo.findByPk.mockResolvedValue({ id: 1 });
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });

    await uc.execute({ categoryId: 1, isActive: true });

    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category_id: 1, is_active: true }),
      })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_14
  // -------------------------------------------------------------------
  it('UT_F04_14 – Trả về đầy đủ pagination (page, limit, total, totalPages)', async () => {
    /**
     * Test Case ID : UT_F04_14
     * Test Objective: Xác minh thông tin phân trang được truyền đúng về cho client
     * Input         : page=1, limit=5, total=12
     * Expected Output: pagination={ page:1, limit:5, total:12, totalPages:3 }
     * Notes         : Client cần pagination để hiển thị điều hướng trang
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 12 });

    const result = await uc.execute({ limit: 5 });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_15
  // -------------------------------------------------------------------
  it('UT_F04_15 – Không truyền categoryId thì không có where.category_id', async () => {
    /**
     * Test Case ID : UT_F04_15
     * Test Objective: Xác minh không lọc category khi không truyền categoryId
     * Input         : không có categoryId
     * Expected Output: where KHÔNG chứa category_id
     * Notes         : catRepo.findByPk() KHÔNG được gọi
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({});

    expect(catRepo.findByPk).not.toHaveBeenCalled();
    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ category_id: expect.anything() }),
      })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_16
  // -------------------------------------------------------------------
  it('UT_F04_16 – Không truyền isActive thì không có where.is_active', async () => {
    /**
     * Test Case ID : UT_F04_16
     * Test Objective: Xác minh không lọc trạng thái khi không truyền isActive
     * Input         : không có isActive
     * Expected Output: where KHÔNG chứa is_active
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({});

    expect(tourRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ is_active: expect.anything() }),
      })
    );
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_17
  // -------------------------------------------------------------------
  it('UT_F04_17 – Page mặc định = 1 khi không truyền', async () => {
    /**
     * Test Case ID : UT_F04_17
     * Test Objective: Xác minh giá trị phân trang mặc định
     * Input         : không truyền page
     * Expected Output: page=1
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const result = await uc.execute({});

    expect(result.pagination.page).toBe(1);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_18
  // -------------------------------------------------------------------
  it('UT_F04_18 – Limit mặc định = 10 khi không truyền', async () => {
    /**
     * Test Case ID : UT_F04_18
     * Test Objective: Xác minh limit mặc định 10 kết quả mỗi trang
     * Input         : không truyền limit
     * Expected Output: limit=10
     */
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const result = await uc.execute({});

    expect(result.pagination.limit).toBe(10);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_19
  // -------------------------------------------------------------------
  it('UT_F04_19 – Tour data trả về đầy đủ các trường từ repository', async () => {
    /**
     * Test Case ID : UT_F04_19
     * Test Objective: Xác minh dữ liệu tour được truyền nguyên vẹn từ DB
     * Input         : Repository trả về tour có đầy đủ fields
     * Expected Output: result.tours[0] có title, price, capacity...
     */
    const tour = {
      id: 1,
      title: 'Tour Hạ Long',
      price: 500000,
      capacity: 30,
      is_active: true,
    };
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [tour], count: 1 });

    const result = await uc.execute({});

    expect(result.tours[0].title).toBe('Tour Hạ Long');
    expect(result.tours[0].price).toBe(500000);
    expect(result.tours[0].capacity).toBe(30);
  });

  // -------------------------------------------------------------------
  // Test Case UT_F04_20
  // -------------------------------------------------------------------
  it('UT_F04_20 – findByPk() được gọi đúng 1 lần với categoryId khi lọc', async () => {
    /**
     * Test Case ID : UT_F04_20
     * Test Objective: Xác minh kiểm tra danh mục tồn tại trước khi query tour
     * Input         : categoryId=5
     * Expected Output: catRepo.findByPk(5) được gọi đúng 1 lần
     * Notes         : CheckDB – đảm bảo danh mục tồn tại trước khi lọc tour
     */
    catRepo.findByPk.mockResolvedValue({ id: 5 });
    tourRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.execute({ categoryId: 5 });

    expect(catRepo.findByPk).toHaveBeenCalledTimes(1);
    expect(catRepo.findByPk).toHaveBeenCalledWith(5);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F04_21 – GetToursUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(GetToursUseCase); });
  it('UT_F04_22 – GetToursUseCase có prototype hợp lệ', () => { expect(GetToursUseCase.prototype).toBeDefined(); });
  it('UT_F04_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F04_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
});
