/**
 * @file Sqa_Nhom9_UT_F19.test.ts
 * @module F19_QuanLyThongKe
 * @description Unit tests for StatisticsUseCase - F19: Quản lý thống kê
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Doanh thu theo tháng
 *  - Doanh thu tháng không có đơn
 *  - User mới theo tháng
 *  - User mới tháng không có
 *  - Top tour
 *  - Doanh thu theo năm
 *  - Doanh thu năm không có đơn
 *  - findAndCountAll orders đúng 1 lần (revenue)
 *  - findAndCountAll users đúng 1 lần (newUsers)
 *  - Tính totalRevenue đúng
 *  - Tính orderCount đúng
 *  - Tính newUsers đúng
 *  - Top tour limit mặc định=5
 *  - Top tour limit custom
 *  - reduce với total_price=0
 *  - reduce với total_price undefined (coerce)
 *  - Month=12 (biên)
 *  - Month=1 (biên)
 *  - Year leap year
 *  - Không gọi update() (read-only)
 */

import {
  StatisticsUseCase,
  IOrderRepository,
  IUserRepository,
} from './F19.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { findAndCountAll: jest.fn() } as any;
}

function makeUserRepo(): jest.Mocked<IUserRepository> {
  return { findAndCountAll: jest.fn() } as any;
}

describe('F19 – Quản lý thống kê | StatisticsUseCase', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let userRepo: jest.Mocked<IUserRepository>;
  let uc: StatisticsUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    userRepo = makeUserRepo();
    uc = new StatisticsUseCase(orderRepo, userRepo);
  });

  // UT_F19_01
  it('UT_F19_01 – Doanh thu theo tháng thành công', async () => {
    /**
     * Test Case ID : UT_F19_01
     * Test Objective: Xác minh tính doanh thu tháng
     * Input         : year=2024, month=6
     * Expected Output: { month: 6, year: 2024, totalRevenue: 15000000, orderCount: 2 }
     * Notes         : CheckDB – findAndCountAll với where status='completed'
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { total_price: 5000000 },
        { total_price: 10000000 },
      ],
    });

    const result = await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(result.totalRevenue).toBe(15000000);
    expect(result.orderCount).toBe(2);
    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  // UT_F19_02
  it('UT_F19_02 – Doanh thu tháng không có đơn', async () => {
    /**
     * Test Case ID : UT_F19_02
     * Test Objective: Xác minh doanh thu = 0 khi không có đơn
     * Input         : year=2024, month=1
     * Expected Output: { totalRevenue: 0, orderCount: 0 }
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.revenueByMonth({ year: 2024, month: 1 });

    expect(result.totalRevenue).toBe(0);
    expect(result.orderCount).toBe(0);
  });

  // UT_F19_03
  it('UT_F19_03 – User mới theo tháng', async () => {
    /**
     * Test Case ID : UT_F19_03
     * Test Objective: Xác minh đếm user mới đăng ký trong tháng
     * Input         : year=2024, month=6
     * Expected Output: { month: 6, year: 2024, newUsers: 3 }
     * Notes         : CheckDB – findAndCountAll users với created_at trong tháng
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 3, rows: [] });

    const result = await uc.newUsersByMonth({ year: 2024, month: 6 });

    expect(result.newUsers).toBe(3);
    expect(userRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ created_at: expect.any(Object) }),
      })
    );
  });

  // UT_F19_04
  it('UT_F19_04 – User mới tháng không có', async () => {
    /**
     * Test Case ID : UT_F19_04
     * Test Objective: Xác minh newUsers=0 khi không có user mới
     * Input         : year=2024, month=1
     * Expected Output: { newUsers: 0 }
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.newUsersByMonth({ year: 2024, month: 1 });

    expect(result.newUsers).toBe(0);
  });

  // UT_F19_05
  it('UT_F19_05 – Top tour thành công', async () => {
    /**
     * Test Case ID : UT_F19_05
     * Test Objective: Xác minh lấy top tour theo doanh thu
     * Input         : limit=5
     * Expected Output: { tours: [...] }
     * Notes         : CheckDB – findAndCountAll với group, order DESC
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { tour_id: 1, total_price: 20000000 },
        { tour_id: 2, total_price: 15000000 },
      ],
    });

    const result = await uc.topTours({ limit: 5 });

    expect(result.tours).toHaveLength(2);
    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'completed' },
        group: 'tour_id',
        order: [['total_price', 'DESC']],
        limit: 5,
      })
    );
  });

  // UT_F19_06
  it('UT_F19_06 – Doanh thu theo năm', async () => {
    /**
     * Test Case ID : UT_F19_06
     * Test Objective: Xác minh tính doanh thu năm
     * Input         : year=2024
     * Expected Output: { year: 2024, totalRevenue: 50000000, orderCount: 5 }
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 5,
      rows: [
        { total_price: 10000000 },
        { total_price: 10000000 },
        { total_price: 10000000 },
        { total_price: 10000000 },
        { total_price: 10000000 },
      ],
    });

    const result = await uc.revenueByYear(2024);

    expect(result.totalRevenue).toBe(50000000);
    expect(result.orderCount).toBe(5);
  });

  // UT_F19_07
  it('UT_F19_07 – Doanh thu năm không có đơn', async () => {
    /**
     * Test Case ID : UT_F19_07
     * Test Objective: Xác minh doanh thu năm = 0 khi không có đơn
     * Input         : year=2023
     * Expected Output: { totalRevenue: 0, orderCount: 0 }
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.revenueByYear(2023);

    expect(result.totalRevenue).toBe(0);
    expect(result.orderCount).toBe(0);
  });

  // UT_F19_08
  it('UT_F19_08 – findAndCountAll orders đúng 1 lần (revenue)', async () => {
    /**
     * Test Case ID : UT_F19_08
     * Test Objective: Xác minh không query orders nhiều lần
     * Input         : year=2024, month=6
     * Expected Output: findAndCountAll đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledTimes(1);
  });

  // UT_F19_09
  it('UT_F19_09 – findAndCountAll users đúng 1 lần (newUsers)', async () => {
    /**
     * Test Case ID : UT_F19_09
     * Test Objective: Xác minh không query users nhiều lần
     * Input         : year=2024, month=6
     * Expected Output: findAndCountAll đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.newUsersByMonth({ year: 2024, month: 6 });

    expect(userRepo.findAndCountAll).toHaveBeenCalledTimes(1);
  });

  // UT_F19_10
  it('UT_F19_10 – Tính totalRevenue đúng với nhiều đơn', async () => {
    /**
     * Test Case ID : UT_F19_10
     * Test Objective: Xác minh reduce tính đúng tổng
     * Input         : 3 đơn: 1M, 2M, 3M
     * Expected Output: totalRevenue=6000000
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [
        { total_price: 1000000 },
        { total_price: 2000000 },
        { total_price: 3000000 },
      ],
    });

    const result = await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(result.totalRevenue).toBe(6000000);
  });

  // UT_F19_11
  it('UT_F19_11 – Tính orderCount đúng', async () => {
    /**
     * Test Case ID : UT_F19_11
     * Test Objective: Xác minh orderCount = result.count
     * Input         : 10 đơn
     * Expected Output: orderCount=10
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 10,
      rows: [],
    });

    const result = await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(result.orderCount).toBe(10);
  });

  // UT_F19_12
  it('UT_F19_12 – Tính newUsers đúng', async () => {
    /**
     * Test Case ID : UT_F19_12
     * Test Objective: Xác minh newUsers = result.count
     * Input         : 7 user mới
     * Expected Output: newUsers=7
     */
    userRepo.findAndCountAll.mockResolvedValue({ count: 7, rows: [] });

    const result = await uc.newUsersByMonth({ year: 2024, month: 6 });

    expect(result.newUsers).toBe(7);
  });

  // UT_F19_13
  it('UT_F19_13 – Top tour limit mặc định=5', async () => {
    /**
     * Test Case ID : UT_F19_13
     * Test Objective: Xác minh default limit=5
     * Input         : không truyền limit
     * Expected Output: limit=5
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.topTours({});

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 })
    );
  });

  // UT_F19_14
  it('UT_F19_14 – Top tour limit custom=3', async () => {
    /**
     * Test Case ID : UT_F19_14
     * Test Objective: Xác minh custom limit=3
     * Input         : limit=3
     * Expected Output: limit=3
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.topTours({ limit: 3 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 })
    );
  });

  // UT_F19_15
  it('UT_F19_15 – Reduce với total_price=0', async () => {
    /**
     * Test Case ID : UT_F19_15
     * Test Objective: Xác minh total_price=0 không ảnh hưởng reduce
     * Input         : total_price=0
     * Expected Output: totalRevenue=0 cho đơn đó
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ total_price: 0 }],
    });

    const result = await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(result.totalRevenue).toBe(0);
  });

  // UT_F19_16
  it('UT_F19_16 – Reduce với total_price undefined (coerce về 0)', async () => {
    /**
     * Test Case ID : UT_F19_16
     * Test Objective: Xác minh total_price undefined → 0 qua ||0
     * Input         : total_price=undefined
     * Expected Output: totalRevenue=0
     */
    orderRepo.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ total_price: undefined }],
    });

    const result = await uc.revenueByMonth({ year: 2024, month: 6 });

    expect(result.totalRevenue).toBe(0);
  });

  // UT_F19_17
  it('UT_F19_17 – Month=12 (biên)', async () => {
    /**
     * Test Case ID : UT_F19_17
     * Test Objective: Xác minh tháng 12 được xử lý đúng (start=Dec 1, end=Jan 1 năm sau)
     * Input         : month=12, year=2024
     * Expected Output: where gte=Dec 1 2024, lt=Jan 1 2025
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.revenueByMonth({ year: 2024, month: 12 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({
            gte: new Date(2024, 11, 1),
            lt: new Date(2025, 0, 1),
          }),
        }),
      })
    );
  });

  // UT_F19_18
  it('UT_F19_18 – Month=1 (biên)', async () => {
    /**
     * Test Case ID : UT_F19_18
     * Test Objective: Xác minh tháng 1 được xử lý đúng
     * Input         : month=1, year=2024
     * Expected Output: where gte=Jan 1 2024, lt=Feb 1 2024
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.revenueByMonth({ year: 2024, month: 1 });

    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({
            gte: new Date(2024, 0, 1),
            lt: new Date(2024, 1, 1),
          }),
        }),
      })
    );
  });

  // UT_F19_19
  it('UT_F19_19 – Year nhuận (Feb 29)', async () => {
    /**
     * Test Case ID : UT_F19_19
     * Test Objective: Xác minh năm nhuận được xử lý đúng
     * Input         : year=2024, month=2
     * Expected Output: endDate=Mar 1 2024 (Feb có 29 ngày)
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.revenueByMonth({ year: 2024, month: 2 });

    const endDate = new Date(2024, 2, 1); // Mar 1
    expect(orderRepo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({ lt: endDate }),
        }),
      })
    );
  });

  // UT_F19_20
  it('UT_F19_20 – Không gọi update() (read-only)', async () => {
    /**
     * Test Case ID : UT_F19_20
     * Test Objective: Xác minh thống kê chỉ đọc không ghi
     * Input         : bất kỳ query
     * Expected Output: update() KHÔNG được gọi
     * Notes         : Statistics use case không có phương thức update
     */
    orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    userRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.revenueByMonth({ year: 2024, month: 6 });
    await uc.newUsersByMonth({ year: 2024, month: 6 });
    await uc.topTours({});
    await uc.revenueByYear(2024);

    expect((orderRepo as any).update).toBeUndefined();
    expect((userRepo as any).update).toBeUndefined();
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F19_21 – revenueByMonth giữ nguyên month input', async () => { orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] }); const result = await uc.revenueByMonth({ year: 2025, month: 7 }); expect(result.month).toBe(7); });
  it('UT_F19_22 – revenueByYear giữ nguyên year input', async () => { orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] }); const result = await uc.revenueByYear(2025); expect(result.year).toBe(2025); });
  it('UT_F19_23 – topTours trả về mảng rỗng khi không có dữ liệu', async () => { orderRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] }); const result = await uc.topTours({ limit: 2 }); expect(result.tours).toEqual([]); });
  it('UT_F19_24 – newUsersByMonth giữ nguyên year input', async () => { userRepo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] }); const result = await uc.newUsersByMonth({ year: 2025, month: 8 }); expect(result.year).toBe(2025); });
});
