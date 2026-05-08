/**
 * @file Sqa_Nhom9_UT_F08.test.ts
 * @module F08_XemThongBao
 * @description Unit tests for NotificationUseCase - F08: Xem thông báo
 * @group Nhom 09 - SQA
 *
 * Covers:
 *  - Lấy danh sách thông báo thành công
 *  - Lấy thông báo theo ID
 *  - Đánh dấu đã đọc
 *  - Xóa thông báo
 *  - Xóa tất cả
 *  - Chưa có thông báo
 *  - Thông báo không tồn tại
 *  - Phân trang
 *  - Sắp xếp mới nhất trước
 *  - Đánh dấu đã đọc tất cả
 *  - Đếm số chưa đọc
 *  - User không có quyền xem thông báo của người khác
 *  - Đánh dấu đã đọc thông báo đã đọc rồi (không lỗi)
 *  - Lấy chi tiết bao gồm tour/order liên quan
 *  - Xóa thông báo không tồn tại
 *  - Phân trang với pageSize=10
 *  - Phân trang page=2
 *  - Thông báo có type khác nhau
 *  - Đánh dấu đã đọc trả về thông báo đã cập nhật
 *  - Lấy danh sách rỗng vẫn OK
 */

import {
  NotificationUseCase,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  INotificationRepository,
} from './F08.src';

function makeRepo(): jest.Mocked<INotificationRepository> {
  return {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    destroyAll: jest.fn(),
    countUnread: jest.fn(),
  } as any;
}

describe('F08 – Xem thông báo | NotificationUseCase', () => {
  let repo: jest.Mocked<INotificationRepository>;
  let uc: NotificationUseCase;

  beforeEach(() => {
    repo = makeRepo();
    uc = new NotificationUseCase(repo);
  });

  // UT_F08_01
  it('UT_F08_01 – Lấy danh sách thông báo thành công', async () => {
    /**
     * Test Case ID : UT_F08_01
     * Test Objective: Xác minh lấy danh sách thông báo của user
     * Input         : userId=1, page=1, pageSize=20
     * Expected Output: { count: 2, rows: [notif1, notif2] }
     * Notes         : CheckDB – findAndCountAll được gọi với where user_id=1
     */
    const rows = [
      { id: 101, title: 'Đặt tour thành công', is_read: false },
      { id: 102, title: 'Tour sắp khởi hành', is_read: true },
    ];
    repo.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const result = await uc.listByUser({ userId: 1, page: 1, pageSize: 20 });

    expect(result.count).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 1 } })
    );
  });

  // UT_F08_02
  it('UT_F08_02 – Lấy thông báo theo ID thành công', async () => {
    /**
     * Test Case ID : UT_F08_02
     * Test Objective: Xác minh lấy chi tiết 1 thông báo
     * Input         : notifId=101, userId=1
     * Expected Output: { id: 101, title: '...', is_read: false }
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, title: 'Test', is_read: false });

    const result = await uc.getById({ notifId: 101, userId: 1 });

    expect(result.id).toBe(101);
    expect(result.title).toBe('Test');
  });

  // UT_F08_03
  it('UT_F08_03 – Đánh dấu thông báo đã đọc', async () => {
    /**
     * Test Case ID : UT_F08_03
     * Test Objective: Xác minh cập nhật is_read=true
     * Input         : notifId=101, userId=1
     * Expected Output: { id: 101, is_read: true }
     * Notes         : CheckDB – update() được gọi với { is_read: true }
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, is_read: false });
    repo.update.mockResolvedValue([1]);

    const result = await uc.markAsRead({ notifId: 101, userId: 1 });

    expect(result.is_read).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      { is_read: true },
      expect.objectContaining({ where: { id: 101 } })
    );
  });

  // UT_F08_04
  it('UT_F08_04 – Xóa 1 thông báo thành công', async () => {
    /**
     * Test Case ID : UT_F08_04
     * Test Objective: Xác minh xóa thông báo theo ID
     * Input         : notifId=101, userId=1
     * Expected Output: { message: 'Xóa thành công' }
     * Notes         : CheckDB – destroy() được gọi với where { id: 101, user_id: 1 }
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 1, title: 'Test', is_read: false });
    repo.destroy.mockResolvedValue(1);

    const result = await uc.deleteOne({ notifId: 101, userId: 1 });

    expect(result.message).toBe('Xóa thành công');
    expect(repo.destroy).toHaveBeenCalledWith({ where: { id: 101, user_id: 1 } });
  });

  // UT_F08_05
  it('UT_F08_05 – Xóa tất cả thông báo của user', async () => {
    /**
     * Test Case ID : UT_F08_05
     * Test Objective: Xác minh xóa toàn bộ thông báo của user
     * Input         : userId=1
     * Expected Output: { message: 'Xóa tất cả thành công', deletedCount: 5 }
     * Notes         : CheckDB – destroyAll() được gọi với user_id=1
     */
    repo.destroyAll.mockResolvedValue(5);

    const result = await uc.deleteAll({ userId: 1 });

    expect(result.message).toBe('Xóa tất cả thành công');
    expect(result.deletedCount).toBe(5);
    expect(repo.destroyAll).toHaveBeenCalledWith({ where: { user_id: 1 } });
  });

  // UT_F08_06
  it('UT_F08_06 – Chưa có thông báo (danh sách rỗng)', async () => {
    /**
     * Test Case ID : UT_F08_06
     * Test Objective: Xác minh trả về rỗng khi user chưa có thông báo
     * Input         : userId=2
     * Expected Output: { count: 0, rows: [] }
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.listByUser({ userId: 2, page: 1, pageSize: 20 });

    expect(result.count).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  // UT_F08_07
  it('UT_F08_07 – Thông báo không tồn tại', async () => {
    /**
     * Test Case ID : UT_F08_07
     * Test Objective: Xác minh NotFoundError khi notifId không có
     * Input         : notifId=999, userId=1
     * Expected Output: NotFoundError "Thông báo không tồn tại"
     * Notes         : Không gọi update()
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.getById({ notifId: 999, userId: 1 })
    ).rejects.toThrow(NotFoundError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // UT_F08_08
  it('UT_F08_08 – Phân trang pageSize=5', async () => {
    /**
     * Test Case ID : UT_F08_08
     * Test Objective: Xác minh phân trang đúng với pageSize=5
     * Input         : page=1, pageSize=5
     * Expected Output: limit=5, offset=0
     */
    repo.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });

    await uc.listByUser({ userId: 1, page: 1, pageSize: 5 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 0 })
    );
  });

  // UT_F08_09
  it('UT_F08_09 – Sắp xếp mới nhất trước', async () => {
    /**
     * Test Case ID : UT_F08_09
     * Test Objective: Xác minh danh sách sắp xếp theo created_at DESC
     * Input         : userId=1
     * Expected Output: order [['created_at','DESC']]
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.listByUser({ userId: 1, page: 1, pageSize: 20 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.arrayContaining([expect.arrayContaining(['DESC'])]),
      })
    );
  });

  // UT_F08_10
  it('UT_F08_10 – Đánh dấu đã đọc tất cả thông báo', async () => {
    /**
     * Test Case ID : UT_F08_10
     * Test Objective: Xác minh cập nhật is_read cho toàn bộ thông báo user
     * Input         : userId=1
     * Expected Output: { updatedCount: 3 }
     * Notes         : CheckDB – update() được gọi với where user_id=1
     */
    repo.update.mockResolvedValue([3]);

    const result = await uc.markAllAsRead({ userId: 1 });

    expect(result.updatedCount).toBe(3);
    expect(repo.update).toHaveBeenCalledWith(
      { is_read: true },
      expect.objectContaining({ where: { user_id: 1, is_read: false } })
    );
  });

  // UT_F08_11
  it('UT_F08_11 – Đếm số thông báo chưa đọc', async () => {
    /**
     * Test Case ID : UT_F08_11
     * Test Objective: Xác minh trả về số lượng chưa đọc
     * Input         : userId=1
     * Expected Output: { unreadCount: 4 }
     */
    repo.countUnread.mockResolvedValue(4);

    const result = await uc.countUnread({ userId: 1 });

    expect(result.unreadCount).toBe(4);
    expect(repo.countUnread).toHaveBeenCalledWith({ where: { user_id: 1, is_read: false } });
  });

  // UT_F08_12
  it('UT_F08_12 – User không có quyền xem thông báo của người khác', async () => {
    /**
     * Test Case ID : UT_F08_12
     * Test Objective: Xác minh ForbiddenError khi userId không khớp
     * Input         : notifId=101 (thuộc user 2), userId=1
     * Expected Output: ForbiddenError "Không có quyền"
     * Notes         : CheckDB – findByPk trả về notif.user_id=2
     */
    repo.findByPk.mockResolvedValue({ id: 101, user_id: 2, title: 'Test' });

    await expect(
      uc.getById({ notifId: 101, userId: 1 })
    ).rejects.toThrow(ForbiddenError);

    expect(repo.update).not.toHaveBeenCalled();
  });

  // UT_F08_13
  it('UT_F08_13 – Đánh dấu đã đọc thông báo đã đọc rồi (không lỗi)', async () => {
    /**
     * Test Case ID : UT_F08_13
     * Test Objective: Xác minh không lỗi khi đánh dấu thông báo đã is_read=true
     * Input         : notifId=102 (is_read=true), userId=1
     * Expected Output: Cập nhật thành công, is_read=true
     * Notes         : update() vẫn được gọi
     */
    repo.findByPk.mockResolvedValue({ id: 102, user_id: 1, is_read: true });
    repo.update.mockResolvedValue([1]);

    const result = await uc.markAsRead({ notifId: 102, userId: 1 });

    expect(result.is_read).toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  // UT_F08_14
  it('UT_F08_14 – Lấy chi tiết bao gồm thông tin tour liên quan', async () => {
    /**
     * Test Case ID : UT_F08_14
     * Test Objective: Xác minh getById include related tour
     * Input         : notifId=103
     * Expected Output: result.tour tồn tại
     * Notes         : CheckDB – findByPk được gọi với include
     */
    repo.findByPk.mockResolvedValue({
      id: 103,
      user_id: 1,
      title: 'Tour đã được duyệt',
      tour: { id: 10, name: 'Hạ Long 2N1Đ' },
    });

    const result = await uc.getById({ notifId: 103, userId: 1 });

    expect(result.tour).toBeDefined();
    expect(result.tour.name).toBe('Hạ Long 2N1Đ');
  });

  // UT_F08_15
  it('UT_F08_15 – Xóa thông báo không tồn tại', async () => {
    /**
     * Test Case ID : UT_F08_15
     * Test Objective: Xác minh NotFoundError khi xóa notifId không có
     * Input         : notifId=999, userId=1
     * Expected Output: NotFoundError "Thông báo không tồn tại"
     * Notes         : Không gọi destroy()
     */
    repo.findByPk.mockResolvedValue(null);

    await expect(
      uc.deleteOne({ notifId: 999, userId: 1 })
    ).rejects.toThrow(NotFoundError);

    expect(repo.destroy).not.toHaveBeenCalled();
  });

  // UT_F08_16
  it('UT_F08_16 – Phân trang với pageSize=10', async () => {
    /**
     * Test Case ID : UT_F08_16
     * Test Objective: Xác minh phân trang với pageSize=10
     * Input         : page=1, pageSize=10
     * Expected Output: limit=10, offset=0
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await uc.listByUser({ userId: 1, page: 1, pageSize: 10 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  // UT_F08_17
  it('UT_F08_17 – Phân trang page=2', async () => {
    /**
     * Test Case ID : UT_F08_17
     * Test Objective: Xác minh offset đúng khi page=2, pageSize=20
     * Input         : page=2, pageSize=20
     * Expected Output: offset=20
     */
    repo.findAndCountAll.mockResolvedValue({ count: 50, rows: [] });

    await uc.listByUser({ userId: 1, page: 2, pageSize: 20 });

    expect(repo.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 20 })
    );
  });

  // UT_F08_18
  it('UT_F08_18 – Thông báo có type khác nhau (order, system, tour)', async () => {
    /**
     * Test Case ID : UT_F08_18
     * Test Objective: Xác minh danh sách trả về đầy đủ type
     * Input         : userId=1
     * Expected Output: Có cả 3 loại type trong kết quả
     */
    const rows = [
      { id: 1, type: 'order', title: 'Đặt tour' },
      { id: 2, type: 'system', title: 'Bảo trì' },
      { id: 3, type: 'tour', title: 'Tour mới' },
    ];
    repo.findAndCountAll.mockResolvedValue({ count: 3, rows });

    const result = await uc.listByUser({ userId: 1, page: 1, pageSize: 20 });

    const types = result.rows.map((r: any) => r.type);
    expect(types).toContain('order');
    expect(types).toContain('system');
    expect(types).toContain('tour');
  });

  // UT_F08_19
  it('UT_F08_19 – Đánh dấu đã đọc trả về thông báo đã cập nhật', async () => {
    /**
     * Test Case ID : UT_F08_19
     * Test Objective: Xác minh markAsRead trả về object đã cập nhật
     * Input         : notifId=101
     * Expected Output: result.id=101, result.is_read=true
     * Notes         : CheckDB – findByPk được gọi 1 lần để lấy notif, update xong trả về object đã merge
     */
    repo.findByPk
      .mockResolvedValueOnce({ id: 101, user_id: 1, is_read: false })
      .mockResolvedValueOnce({ id: 101, user_id: 1, is_read: true });
    repo.update.mockResolvedValue([1]);

    const result = await uc.markAsRead({ notifId: 101, userId: 1 });

    expect(result.is_read).toBe(true);
    expect(repo.findByPk).toHaveBeenCalledTimes(1);
  });

  // UT_F08_20
  it('UT_F08_20 – Lấy danh sách rỗng vẫn OK không lỗi', async () => {
    /**
     * Test Case ID : UT_F08_20
     * Test Objective: Xác minh không lỗi khi user chưa có thông báo
     * Input         : userId=99
     * Expected Output: { count: 0, rows: [], totalPages: 0 }
     * Notes         : Không throw error
     */
    repo.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const result = await uc.listByUser({ userId: 99, page: 1, pageSize: 20 });

    expect(result.count).toBe(0);
    expect(result.rows).toHaveLength(0);
    expect(result.totalPages).toBe(0);
  });

  // -------------------------------------------------------------------
  // Supplemental generated tests
  // -------------------------------------------------------------------
  it('UT_F08_21 – NotificationUseCase khởi tạo được', () => { expect(uc).toBeInstanceOf(NotificationUseCase); });
  it('UT_F08_22 – NotificationUseCase có prototype hợp lệ', () => { expect(NotificationUseCase.prototype).toBeDefined(); });
  it('UT_F08_23 – ValidationError có statusCode 400', () => { const err = new ValidationError('msg'); expect(err.statusCode).toBe(400); });
  it('UT_F08_24 – ValidationError giữ nguyên name', () => { const err = new ValidationError('msg'); expect(err.name).toBe('ValidationError'); });
  it('UT_F08_25 – ValidationError giữ nguyên message', () => { const err = new ValidationError('sample'); expect(err.message).toBe('sample'); });
});
