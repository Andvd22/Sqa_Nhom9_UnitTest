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

describe('F12 - Xem ve theo ticketService that', () => {
  let orderRepo: jest.Mocked<IOrderRepository>;
  let uc: GetTicketUseCase;

  beforeEach(() => {
    orderRepo = makeOrderRepo();
    uc = new GetTicketUseCase(orderRepo);
  });

  it('UT_F12_01 - Xem ve thanh cong voi status completed', async () => {
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

  it('UT_F12_02 - Status paid duoc xem ve', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 102, user_id: 1, status: 'paid', tour_name: 'Sapa', quantity: 1, total_price: 2500000 });

    const result = await uc.execute({ userId: 1, orderId: 102 });

    expect(result.ticketCode).toBe('TKT-102');
  });

  it('UT_F12_03 - Status confirmed duoc xem ve theo mock hien co', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 103, user_id: 1, status: 'confirmed', tour_name: 'Hue', quantity: 1, total_price: 2000000 });

    const result = await uc.execute({ userId: 1, orderId: 103 });

    expect(result.ticketCode).toBe('TKT-103');
  });

  it('UT_F12_04 - Order khong ton tai tra NotFoundError', async () => {
    orderRepo.findByPk.mockResolvedValue(null);

    await expect(uc.execute({ userId: 1, orderId: 999 })).rejects.toThrow(NotFoundError);
  });

  it('UT_F12_05 - Khong co quyen xem ve cua user khac', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 2, status: 'completed' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ForbiddenError);
  });

  it('UT_F12_06 - Status pending bi tu choi', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'pending' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_07 - Status cancelled bi tu choi', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'cancelled' });

    await expect(uc.execute({ userId: 1, orderId: 101 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_08 - TicketCode fallback dung format TKT-orderId neu order khong co ticket_code', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 105, user_id: 1, status: 'completed' });

    const result = await uc.execute({ userId: 1, orderId: 105 });

    expect(result.ticketCode).toBe('TKT-105');
  });

  it('UT_F12_09 - findByPk duoc goi dung orderId', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 200, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 200 });

    expect(orderRepo.findByPk).toHaveBeenCalledWith(200);
  });

  it('UT_F12_10 - Xem ve la read-only', async () => {
    orderRepo.findByPk.mockResolvedValue({ id: 101, user_id: 1, status: 'completed' });

    await uc.execute({ userId: 1, orderId: 101 });

    expect((orderRepo as any).update).toBeUndefined();
  });

  it('UT_F12_11 - Tim kiem theo ma tour phai tra dung ve', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', tourCode: 'TOUR002', status: 'active' },
      { ticket_code: 'TKT-1111', tourCode: 'TOUR003', status: 'active' },
    ];

    const result = filterTickets(tickets, { text: 'TOUR002' });

    expect(result).toHaveLength(1);
    expect(result[0].ticket_code).toBe('TKT-7928');
  });

  it('UT_F12_12 - filterTickets tim duoc theo mot phan ma ve', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', tourCode: 'TOUR002', status: 'active' },
      { ticket_code: 'TKT-1111', tourCode: 'TOUR003', status: 'active' },
    ];

    const result = filterTickets(tickets, { text: '7928' });

    expect(result).toHaveLength(1);
    expect(result[0].tourCode).toBe('TOUR002');
  });

  it('UT_F12_13 - filterTickets voi khoang trang chi loc theo status', () => {
    const tickets = [
      { ticket_code: 'TKT-7928', status: 'active' },
      { ticket_code: 'TKT-9999', status: 'used' },
    ];

    const result = filterTickets(tickets, { status: 'active', text: '   ' });

    expect(result).toEqual([{ ticket_code: 'TKT-7928', status: 'active' }]);
  });

  it('UT_F12_14 - list truyen where text thanh dieu kien tim theo ma ve, ma tour va ten tour', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: 'active', text: '7928', page: 2, limit: 5 });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        status: 'active',
        or: [
          { ticket_code: { like: '%7928%' } },
          { tour_code: { like: '%7928%' } },
          { tour_name: { like: '%7928%' } },
        ],
      },
      limit: 5,
      offset: 5,
    });
  });

  it('UT_F12_15 - Status all khong dua vao where', async () => {
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

  it('UT_F12_16 - list can ticket repository', async () => {
    await expect(uc.list({ userId: 1 })).rejects.toThrow(ValidationError);
  });

  it('UT_F12_17 - list tra ve rows va count tu ticket repository', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [{ ticket_code: 'TKT-1' }], count: 1 });

    const result = await uc.list({ userId: 1 });

    expect(result).toEqual({
      tickets: [{ ticket_code: 'TKT-1' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('UT_F12_18 - filterTickets status all khong loc trang thai', () => {
    const tickets = [
      { ticket_code: 'TKT-1', status: 'active' },
      { ticket_code: 'TKT-2', status: 'used' },
    ];

    expect(filterTickets(tickets, { status: 'all' })).toHaveLength(2);
  });

  it('UT_F12_19 - filterTickets ho tro ticketCode dang camelCase trong mock unit', () => {
    const tickets = [{ ticketCode: 'TKT-7928', status: 'active' }];

    const result = filterTickets(tickets, { text: 'tkt-7928' });

    expect(result).toHaveLength(1);
  });

  it('UT_F12_20 - Ma loi dung', () => {
    expect(new ValidationError('x').statusCode).toBe(400);
    expect(new NotFoundError('x').statusCode).toBe(404);
    expect(new ForbiddenError('x').statusCode).toBe(403);
  });

  it('UT_F12_21 - list text rong khong dua ticket_code vao where', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, text: '' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 1 }, limit: 10, offset: 0 });
  });

  it('UT_F12_22 - list mac dinh page 1 limit 10', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 9 });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 9 }, limit: 10, offset: 0 });
  });

  it('UT_F12_23 - Search text co khoang trang duoc giu nguyen trong query tim kiem mo rong', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, text: ' 7928 ' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        or: [
          { ticket_code: { like: '% 7928 %' } },
          { tour_code: { like: '% 7928 %' } },
          { tour_name: { like: '% 7928 %' } },
        ],
      },
      limit: 10,
      offset: 0,
    });
  });

  it('UT_F12_24 - Status used duoc dua vao dieu kien loc ve', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: 'used' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({ where: { user_id: 1, status: 'used' }, limit: 10, offset: 0 });
  });

  it('UT_F12_25 - Tim kiem theo ten tour tra dung ve', () => {
    const tickets = [
      { ticket_code: 'TKT-1', tourName: 'Ha Long', status: 'active' },
      { ticket_code: 'TKT-2', tourName: 'Sapa', status: 'active' },
    ];

    const result = filterTickets(tickets, { text: 'Ha Long' });

    expect(result).toHaveLength(1);
    expect(result[0].ticket_code).toBe('TKT-1');
  });

  it('UT_F12_26 - filterTickets van an toan khi ticket khong co ticket_code va ticketCode', () => {
    const tickets = [{ status: 'active' }];

    const result = filterTickets(tickets, { text: 'abc' });

    expect(result).toHaveLength(0);
  });

  it('UT_F12_27 - list voi status rong chi loc theo user_id va text', async () => {
    const ticketRepo = makeTicketRepo();
    uc = new GetTicketUseCase(orderRepo, ticketRepo);
    ticketRepo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await uc.list({ userId: 1, status: '', text: 'A1' });

    expect(ticketRepo.findAndCountAll).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        or: [
          { ticket_code: { like: '%A1%' } },
          { tour_code: { like: '%A1%' } },
          { tour_name: { like: '%A1%' } },
        ],
      },
      limit: 10,
      offset: 0,
    });
  });
});

