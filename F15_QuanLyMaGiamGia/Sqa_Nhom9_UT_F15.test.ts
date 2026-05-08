/**
 * @file Sqa_Nhom9_UT_F15.test.ts
 * @module F15_QuanLyMaGiamGia
 * @description Unit tests for CouponManagementUseCase - F15: Quản lý mã giảm giá
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Tạo coupon thành công
 *  - Code rỗng
 *  - Percent <= 0
 *  - Percent > 100
 *  - Fixed amount <= 0
 *  - Ngày kết thúc <= ngày bắt đầu
 *  - Code trùng
 *  - Cập nhật coupon thành công
 *  - Cập nhật percent > 100
 *  - Ngày kết thúc <= hiện tại
 *  - Xóa coupon thành công
 *  - Xóa coupon đã sử dụng
 *  - Lấy coupon hợp lệ
 *  - Coupon không tồn tại (get)
 *  - Coupon hết hạn (get)
 *  - Coupon bị vô hiệu hóa (get)
 *  - Áp dụng coupon percent
 *  - Áp dụng coupon fixed
 *  - Áp dụng coupon vượt quá totalPrice
 *  - findOne code được gọi đúng 1 lần
 */

import {
  CouponManagementUseCase,
  ValidationError,
  NotFoundError,
  ConflictError,
  ICouponRepository,
} from './F15.src';

function makeRepo(): jest.Mocked<ICouponRepository> {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  } as any;
}

describe('F15 – Quản lý mã giảm giá | CouponManagementUseCase', () => {
  let repo: jest.Mocked<ICouponRepository>;
  let uc: CouponManagementUseCase;

  beforeEach(() => {
    repo = makeRepo();
    uc = new CouponManagementUseCase(repo);
  });

  // UT_F15_01
  it('UT_F15_01 – Tạo coupon thành công', async () => {
    /**
     * Test Case ID : UT_F15_01
     * Test Objective: Xác minh tạo coupon cơ bản thành công
     * Input         : code='SUMMER20', type='percent', amount=20, startDate, endDate
     * Expected Output: coupon object
     * Notes         : CheckDB – create() được gọi với code trim
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, code: 'SUMMER20' });

    const start = new Date();
    const end = new Date(Date.now() + 86400000 * 7);
    const result = await uc.createCoupon({
      code: 'SUMMER20',
      discount_type: 'percent',
      discount_amount: 20,
      start_date: start,
      end_date: end,
    });

    expect(result.code).toBe('SUMMER20');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUMMER20' })
    );
  });

  // UT_F15_02
  it('UT_F15_02 – Code rỗng', async () => {
    /**
     * Test Case ID : UT_F15_02
     * Test Objective: Xác minh ValidationError khi code rỗng
     * Input         : code=''
     * Expected Output: ValidationError "Mã không được để trống"
     * Notes         : Không create
     */
    await expect(
      uc.createCoupon({
        code: '',
        discount_type: 'percent',
        discount_amount: 20,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow(ValidationError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_03
  it('UT_F15_03 – Percent <= 0', async () => {
    /**
     * Test Case ID : UT_F15_03
     * Test Objective: Xác minh ValidationError khi percent=0
     * Input         : discount_amount=0
     * Expected Output: ValidationError "Phần trăm giảm giá từ 1-100"
     * Notes         : Không create
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.createCoupon({
        code: 'ZERO',
        discount_type: 'percent',
        discount_amount: 0,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow(ValidationError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_04
  it('UT_F15_04 – Percent > 100', async () => {
    /**
     * Test Case ID : UT_F15_04
     * Test Objective: Xác minh ValidationError khi percent>100
     * Input         : discount_amount=101
     * Expected Output: ValidationError "Phần trăm giảm giá từ 1-100"
     * Notes         : Không create
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.createCoupon({
        code: 'TOOBIG',
        discount_type: 'percent',
        discount_amount: 101,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow(ValidationError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_05
  it('UT_F15_05 – Fixed amount <= 0', async () => {
    /**
     * Test Case ID : UT_F15_05
     * Test Objective: Xác minh ValidationError khi fixed amount=0
     * Input         : discount_amount=0
     * Expected Output: ValidationError "Số tiền giảm phải > 0"
     * Notes         : Không create
     */
    repo.findOne.mockResolvedValue(null);

    await expect(
      uc.createCoupon({
        code: 'ZERO',
        discount_type: 'fixed',
        discount_amount: 0,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow(ValidationError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_06
  it('UT_F15_06 – Ngày kết thúc <= ngày bắt đầu', async () => {
    /**
     * Test Case ID : UT_F15_06
     * Test Objective: Xác minh ValidationError khi end_date <= start_date
     * Input         : end_date < start_date
     * Expected Output: ValidationError "Ngày kết thúc phải sau ngày bắt đầu"
     * Notes         : Không create
     */
    const start = new Date();
    const end = new Date(start.getTime() - 86400000);

    await expect(
      uc.createCoupon({
        code: 'BAD',
        discount_type: 'fixed',
        discount_amount: 100000,
        start_date: start,
        end_date: end,
      })
    ).rejects.toThrow(ValidationError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_07
  it('UT_F15_07 – Code trùng', async () => {
    /**
     * Test Case ID : UT_F15_07
     * Test Objective: Xác minh ConflictError khi code đã tồn tại
     * Input         : code='DUPLICATE' (đã có trong DB)
     * Expected Output: ConflictError "Mã đã tồn tại"
     * Notes         : Không create
     */
    repo.findOne.mockResolvedValue({ id: 1, code: 'DUPLICATE' });

    await expect(
      uc.createCoupon({
        code: 'DUPLICATE',
        discount_type: 'percent',
        discount_amount: 10,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow(ConflictError);

    expect(repo.create).not.toHaveBeenCalled();
  });

  // UT_F15_08
  it('UT_F15_08 – Cập nhật coupon thành công', async () => {
    /**
     * Test Case ID : UT_F15_08
     * Test Objective: Xác minh cập nhật coupon
     * Input         : couponId=1, discount_amount=15
     * Expected Output: { message: 'Cập nhật thành công' }
     * Notes         : CheckDB – update() được gọi
     */
    repo.findByPk.mockResolvedValue({ id: 1, discount_type: 'percent' });
    repo.update.mockResolvedValue([1]);

    const result = await uc.updateCoupon({ couponId: 1, discount_amount: 15 });

    expect(result.message).toBe('Cập nhật thành công');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ discount_amount: 15 }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F15_09
  it('UT_F15_09 – Cập nhật percent > 100', async () => {
    /**
     * Test Case ID : UT_F15_09
     * Test Objective: Xác minh ValidationError khi update percent>100
     * Input         : discount_amount=150
     * Expected Output: ValidationError "Phần trăm <= 100"
     * Notes         : Không update
     */
    repo.findByPk.mockResolvedValue({ id: 1, discount_type: 'percent' });

    await expect(
      uc.updateCoupon({ couponId: 1, discount_amount: 150 })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // UT_F15_10
  it('UT_F15_10 – Ngày kết thúc <= hiện tại', async () => {
    /**
     * Test Case ID : UT_F15_10
     * Test Objective: Xác minh ValidationError khi update end_date <= now
     * Input         : end_date=yesterday
     * Expected Output: ValidationError "Ngày kết thúc phải sau hiện tại"
     * Notes         : Không update
     */
    repo.findByPk.mockResolvedValue({ id: 1 });

    await expect(
      uc.updateCoupon({ couponId: 1, end_date: new Date(Date.now() - 86400000) })
    ).rejects.toThrow(ValidationError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // UT_F15_11
  it('UT_F15_11 – Xóa coupon thành công', async () => {
    /**
     * Test Case ID : UT_F15_11
     * Test Objective: Xác minh xóa coupon chưa sử dụng
     * Input         : couponId=1, is_used=false
     * Expected Output: { message: 'Xóa thành công' }
     * Notes         : CheckDB – update() với deleted_at
     */
    repo.findByPk.mockResolvedValue({ id: 1, is_used: false });
    repo.update.mockResolvedValue([1]);

    const result = await uc.deleteCoupon(1);

    expect(result.message).toBe('Xóa thành công');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(Date) }),
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  // UT_F15_12
  it('UT_F15_12 – Xóa coupon đã sử dụng', async () => {
    /**
     * Test Case ID : UT_F15_12
     * Test Objective: Xác minh ConflictError khi coupon is_used=true
     * Input         : is_used=true
     * Expected Output: ConflictError "Mã đã được sử dụng"
     * Notes         : Không update
     */
    repo.findByPk.mockResolvedValue({ id: 1, is_used: true });

    await expect(uc.deleteCoupon(1)).rejects.toThrow(ConflictError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // UT_F15_13
  it('UT_F15_13 – Lấy coupon hợp lệ', async () => {
    /**
     * Test Case ID : UT_F15_13
     * Test Objective: Xác minh lấy coupon còn hiệu lực
     * Input         : code='VALID10'
     * Expected Output: coupon object
     * Notes         : CheckDB – findOne với code trim
     */
    repo.findOne.mockResolvedValue({
      code: 'VALID10',
      discount_type: 'percent',
      discount_amount: 10,
      end_date: new Date(Date.now() + 86400000),
      is_active: true,
    });

    const result = await uc.getCoupon({ code: 'VALID10' });

    expect(result.code).toBe('VALID10');
  });

  // UT_F15_14
  it('UT_F15_14 – Coupon không tồn tại (get)', async () => {
    /**
     * Test Case ID : UT_F15_14
     * Test Objective: Xác minh NotFoundError khi code không có
     * Input         : code='NOTFOUND'
     * Expected Output: NotFoundError "Mã không tồn tại"
     */
    repo.findOne.mockResolvedValue(null);

    await expect(uc.getCoupon({ code: 'NOTFOUND' })).rejects.toThrow(NotFoundError);
  });

  // UT_F15_15
  it('UT_F15_15 – Coupon hết hạn (get)', async () => {
    /**
     * Test Case ID : UT_F15_15
     * Test Objective: Xác minh ValidationError khi coupon hết hạn
     * Input         : end_date < now
     * Expected Output: ValidationError "Mã đã hết hạn"
     */
    repo.findOne.mockResolvedValue({
      code: 'EXPIRED',
      end_date: new Date(Date.now() - 86400000),
      is_active: true,
    });

    await expect(uc.getCoupon({ code: 'EXPIRED' })).rejects.toThrow(ValidationError);
  });

  // UT_F15_16
  it('UT_F15_16 – Coupon bị vô hiệu hóa (get)', async () => {
    /**
     * Test Case ID : UT_F15_16
     * Test Objective: Xác minh ValidationError khi is_active=false
     * Input         : is_active=false
     * Expected Output: ValidationError "Mã đã bị vô hiệu hóa"
     */
    repo.findOne.mockResolvedValue({
      code: 'INACTIVE',
      end_date: new Date(Date.now() + 86400000),
      is_active: false,
    });

    await expect(uc.getCoupon({ code: 'INACTIVE' })).rejects.toThrow(ValidationError);
  });

  // UT_F15_17
  it('UT_F15_17 – Áp dụng coupon percent', async () => {
    /**
     * Test Case ID : UT_F15_17
     * Test Objective: Xác minh giảm giá theo phần trăm
     * Input         : totalPrice=1000000, coupon percent=20
     * Expected Output: newPrice=800000
     */
    repo.findOne.mockResolvedValue({
      code: 'PERCENT20',
      discount_type: 'percent',
      discount_amount: 20,
      end_date: new Date(Date.now() + 86400000),
      is_active: true,
    });

    const result = await uc.applyCoupon({ code: 'PERCENT20', totalPrice: 1000000 });

    expect(result.newPrice).toBe(800000);
    expect(result.originalPrice).toBe(1000000);
  });

  // UT_F15_18
  it('UT_F15_18 – Áp dụng coupon fixed', async () => {
    /**
     * Test Case ID : UT_F15_18
     * Test Objective: Xác minh giảm giá cố định
     * Input         : totalPrice=1000000, coupon fixed=300000
     * Expected Output: newPrice=700000
     */
    repo.findOne.mockResolvedValue({
      code: 'FIXED300',
      discount_type: 'fixed',
      discount_amount: 300000,
      end_date: new Date(Date.now() + 86400000),
      is_active: true,
    });

    const result = await uc.applyCoupon({ code: 'FIXED300', totalPrice: 1000000 });

    expect(result.newPrice).toBe(700000);
  });

  // UT_F15_19
  it('UT_F15_19 – Áp dụng coupon vượt quá totalPrice', async () => {
    /**
     * Test Case ID : UT_F15_19
     * Test Objective: Xác minh newPrice không âm (floor=0)
     * Input         : totalPrice=100000, coupon fixed=200000
     * Expected Output: newPrice=0
     */
    repo.findOne.mockResolvedValue({
      code: 'BIGFIXED',
      discount_type: 'fixed',
      discount_amount: 200000,
      end_date: new Date(Date.now() + 86400000),
      is_active: true,
    });

    const result = await uc.applyCoupon({ code: 'BIGFIXED', totalPrice: 100000 });

    expect(result.newPrice).toBe(0);
  });

  // UT_F15_20
  it('UT_F15_20 – findOne code được gọi đúng 1 lần (create)', async () => {
    /**
     * Test Case ID : UT_F15_20
     * Test Objective: Xác minh không query code nhiều lần
     * Input         : code='TEST'
     * Expected Output: findOne({where:{code:'TEST'}}) đúng 1 lần
     * Notes         : CheckDB – tránh N+1
     */
    repo.findOne.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1 });

    await uc.createCoupon({
      code: 'TEST',
      discount_type: 'fixed',
      discount_amount: 100000,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000),
    });

    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'TEST' } })
    );
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F15_21 – CouponManagementUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(CouponManagementUseCase); });
  it('UT_F15_22 – CouponManagementUseCase có prototype hợp lệ', () => { expect(CouponManagementUseCase.prototype).toBeDefined(); });
  it('UT_F15_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F15_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F15_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
  it('UT_F15_26 – NotFoundError có statusCode 404', () => { const err = new NotFoundError('msg'); expect(err.statusCode).toBe(404); });
  it('UT_F15_27 – NotFoundError giữ nguyên name', () => { const err = new NotFoundError('msg'); expect(err.name).toBe('NotFoundError'); });
});
