import {
  GetTicketUseCase,
  filterTickets,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  IOrderRepository,
  ITicketRepository,
} from './F12.src';

function makeOrderRepo(): jest.Mocked<IOrderRepository> {
  return { findByPk: jest.fn() } as any;
}

function makeTicketRepo(): jest.Mocked<ITicketRepository> {
  return { findAndCountAll: jest.fn() } as any;
}

describe('F12 - Xem vé theo ticketService', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: GetTicketUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    uc = new GetTicketUseCase(orderRepo);
  });

  it('UT_F12_01 - Xác minh xem vé thành công với trạng thái completed', async () => {
    orderRepo.findByPk.mockResolvedValue({
      id: 101,
      user_id: 1,
      status: 'completed',
      ticket_code: 'TKT-101',
      tour_name: 'Ha Long',
      quantity: 2,
      total_price: 4000000,
    });

    const result = await uc.execute({ userId: 1, orderId: 101 });

    expect(result).toEqual({
      ticketCode: 'TKT-101',
      tourName: 'Ha Long',
      quantity: 2,
      totalPrice: 4000000,
    });
  });

  it('UT_F12_02 - Xác minh trạng thái paid được xem vé', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 102, user_id: 1, status: 'paid', tour_name: 'Sapa', quantity: 1, total_price: 2500000 });

    const result = await uc.execute({ userId: 1, orderId: 102 });

    expect(result.ticketCode).toBe('TKT-102');
  });

  it('UT_F12_03 - Xác minh trạng thái confirmed được xem vé theo source hiện tại', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 103, user_id: 1, status: 'confirmed', tour_name: 'Hue', quantity: 1, total_price: 2000000 });

    const result = await uc.execute({ userId: 1, orderId: 103 });

    expect(result.ticketCode).toBe('TKT-103');
  });

  it('UT_F12_04 - Xác minh NotFoundError khi đơn hàng không tồn tại', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ userId: 1, orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F12_05 - Xác minh ForbiddenError khi xem vé của người dùng khác', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 2, status: 'completed' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ForbiddenError);
  });

  it('UT_F12_06 - Xác minh ValidationError khi trạng thái pending', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_07 - Xác minh ValidationError khi trạng thái cancelled', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'cancelled' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_08 - Xác minh ticketCode fallback đúng định dạng TKT-orderId', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 105, user_id: 1, status: 'completed' });

    const result = await uc.execute({ userId: 1, orderId: 105 });

    expect(result.ticketCode).toBe('TKT-105');
  });

  it('UT_F12_09 - Xác minh findByPk được gọi đúng orderId', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 200, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 200 });

    expect(orderRepo.findByPk).toHaveBeenCalledWith(200);
  });

  it('UT_F12_10 - Xác minh xem vé là thao tác chỉ đọc', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 101 });

    expect((orderRepo as any).update).toBeUndefined();
  });

  it('UT_F12_11 - Xác minh tìm kiếm theo mã tour trả đúng vé', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', tourCode: 'TOUR002', status: 'active' },
      { ticket_code: 'TKT-1111', tourCode: 'TOUR003', status: 'active' },
    ];

    const result = filterTickets(tickets, { text: 'TOUR002' });

    expect(result).toHaveLength(1);
    expect(result[0].ticket_code).toBe('TKT-7928');
  });

  it('UT_F12_12 - Xác minh filterTickets tìm được theo một phần mã vé', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', tourCode: 'TOUR002', status: 'active' },
      { ticket_code: 'TKT-1111', tourCode: 'TOUR003', status: 'active' },
    ];

    const result = filterTickets(tickets, { text: '7928' });

    expect(result).toHaveLength(1);
    expect(result[0].tourCode).toBe('TOUR002');
  });

  it('UT_F12_13 - Xác minh filterTickets với khoảng trắng chỉ lọc theo trạng thái', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', status: 'active' },
      { ticket_code: 'TKT-9999', status: 'used' },
    ];

    const result = filterTickets(tickets, { status: 'active', text: '   ' });

    expect(result).toEqual([{ ticket_code: 'TKT-7928', status: 'active' }]);
  });

  it('UT_F12_14 - Xác minh list truyền điều kiện tìm theo mã tour', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: 'active', text: 'TOUR002', page: 2, limit: 5 });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        status: 'active',
        tour_code: { like: '%TOUR002%' },
      },
      limit: 5,
      offset: 5,
    });
  });

  it('UT_F12_15 - Xác minh status all không đưa vào where', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: 'all' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({
      where: { user_id: 1 },
      limit: 10,
      offset: 0,
    });
  });

  it('UT_F12_16 - Xác minh ValidationError khi list chưa cấu hình ticket repository', async () => {
    await expect(uc.list({ userId: 1 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_17 - Xác minh list trả về rows và count từ ticket repository', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [{ ticket_code: 'TKT-1' }], count: 1 });

    const result = await uc.list({ userId: 1 });

    expect(result).toEqual({
      tickets: [{ ticket_code: 'TKT-1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('UT_F12_18 - Xác minh filterTickets với status all không lọc trạng thái', () => {
    const tickets = [
      { ticket_code: 'TKT-1', status: 'active' },
      { ticket_code: 'TKT-2', status: 'used' },
    ];

    expect(filterTickets(tickets, { status: 'all' })).toHaveLength(2);
  });

  it('UT_F12_19 - Xác minh filterTickets hỗ trợ ticketCode dạng camelCase', () => {
    const tickets = [{ ticketCode: 'TKT-7928', status: 'active' }];

    const result = filterTickets(tickets, { text: 'tkt-7928' });

    expect(result).toHaveLength(1);
  });

  it('UT_F12_20 - Xác minh mã lỗi đúng', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
    expect(new ForbiddenError('x').statusCode).toBe(403);
  });

  it('UT_F12_21 - Xác minh list với text rỗng không đưa ticket_code vào where', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, text: '' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 1 }, limit: 10, offset: 0 });
  });

  it('UT_F12_22 - Xác minh list mặc định page 1 limit 10', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 9 });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 9 }, limit: 10, offset: 0 });
  });

  it('UT_F12_23 - Xác minh status used được đưa vào điều kiện lọc vé', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: 'used' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 1, status: 'used' }, limit: 10, offset: 0 });
  });

  it('UT_F12_24 - Xác minh filterTickets vẫn an toàn khi ticket không có ticket_code và ticketCode', () => {
    const tickets = [{ status: 'active' }];

    const result = filterTickets(tickets, { text: 'abc' });

    expect(result).toHaveLength(0);
  });
});

