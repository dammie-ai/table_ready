const request = require('supertest');
const app = require('../src/app');

describe('TableReady API', () => {
  let authToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'manager_test', password: 'password123' });
    authToken = res.body.token;
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'manager_test', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });

  describe('Dashboard', () => {
    it('should return dashboard config for manager', async () => {
      const res = await request(app)
        .get('/api/dashboard/config')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe('manager');
    });
  });

  describe('Menu', () => {
    it('should return menu items', async () => {
      const res = await request(app).get('/api/menu');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should return modifiers', async () => {
      const res = await request(app)
        .get('/api/modifiers')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  describe('Reservations', () => {
    it('should create a reservation', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Test Customer',
          reservation_date: '2026-07-28',
          reservation_time: '19:00:00',
          party_size: 2
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reservation.reservation_id).toBeDefined();
    });

    it('should get reservations for date', async () => {
      const res = await request(app)
        .get('/api/reservations/date/2026-07-28')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.reservations).toBeDefined();
    });
  });

  describe('Delivery', () => {
    it('should return available deliveries', async () => {
      const res = await request(app)
        .get('/api/dashboard/delivery')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('delivery');
    });
  });

  describe('Validation', () => {
    it('should reject invalid order type', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          order_type: 'INVALID',
          items: []
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Scheduling', () => {
    it('should create a schedule', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: 1,
          schedule_date: '2026-07-29',
          start_time: '09:00:00',
          end_time: '17:00:00'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get schedules', async () => {
      const res = await request(app)
        .get('/api/schedules')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Purchase Orders', () => {
    it('should create a supplier', async () => {
      const res = await request(app)
        .post('/api/purchase-orders/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Supplier',
          email: 'test@supplier.com'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should get suppliers', async () => {
      const res = await request(app)
        .get('/api/purchase-orders/suppliers')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should get notification templates', async () => {
      const res = await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Tax Compliance', () => {
    it('should get tax jurisdictions', async () => {
      const res = await request(app)
        .get('/api/tax/jurisdictions')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get tax rates', async () => {
      const res = await request(app)
        .get('/api/tax/rates')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
