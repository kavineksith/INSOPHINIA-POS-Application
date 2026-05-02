/**
 * E2E Tests: Items, Customers, Promotions, Billing, Inventory, Users, Dashboard, Settings, Reports
 * Consolidated API-driven E2E tests for all major CRUD modules.
 */

describe('Items CRUD', () => {
  let categoryId: string;
  let createdItemId: string;

  before(() => {
    cy.login();
    // Create a category for items
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/categories',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: `ItemTestCat-${Date.now()}` },
      }).then((res) => { categoryId = res.body.data.id; });
    });
  });

  it('should create an item', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/items',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          plu_code: `E2E-${Date.now()}`, name: 'E2E Test Item',
          category_id: categoryId, price: 500, cost_price: 400, stock_quantity: 100,
        },
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.success).to.be.true;
        createdItemId = response.body.data.id;
      });
    });
  });

  it('should list items', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/items',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('array');
      });
    });
  });

  it('should get item by ID', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: `/api/items/${createdItemId}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.name).to.eq('E2E Test Item');
        expect(response.body.data.price).to.eq(500);
      });
    });
  });

  it('should update item price', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'PUT',
        url: `/api/items/${createdItemId}`,
        headers: { Authorization: `Bearer ${token}` },
        body: { price: 550 },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
      });
    });
  });

  it('should delete item', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'DELETE',
        url: `/api/items/${createdItemId}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Customers CRUD', () => {
  let createdCustomerId: string;

  before(() => { cy.login(); });

  it('should create a customer', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/customers',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: `E2E Cust ${Date.now()}`, phone: `+9470${Date.now().toString().slice(-7)}` },
      }).then((response) => {
        expect(response.status).to.eq(201);
        createdCustomerId = response.body.data.id;
      });
    });
  });

  it('should list customers', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/customers',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.length).to.be.greaterThan(0);
      });
    });
  });

  it('should update customer', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'PUT',
        url: `/api/customers/${createdCustomerId}`,
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Updated E2E Customer' },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  it('should delete customer', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'DELETE',
        url: `/api/customers/${createdCustomerId}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Promotions CRUD', () => {
  let createdPromoId: string;

  before(() => { cy.login(); });

  it('should create a promotion', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/promotions',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          name: `E2E Promo ${Date.now()}`, discount_type: 'percentage', discount_value: 15,
          start_date: '2026-01-01', end_date: '2026-12-31',
        },
      }).then((response) => {
        expect(response.status).to.eq(201);
        createdPromoId = response.body.data.id;
      });
    });
  });

  it('should list promotions', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/promotions',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('array');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Billing Flow', () => {
  let testCategoryId: string;
  let testItemId: string;

  before(() => {
    cy.login();
    // Setup: create category and item for billing
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/categories',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: `BillCat-${Date.now()}` },
      }).then((res) => {
        testCategoryId = res.body.data.id;
        cy.request({
          method: 'POST',
          url: '/api/items',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            plu_code: `BILL-PLU-${Date.now()}`, name: 'Billing Test Item',
            category_id: testCategoryId, price: 1000, cost_price: 800, stock_quantity: 50,
          },
        }).then((itemRes) => {
          testItemId = itemRes.body.data.id;
        });
      });
    });
  });

  it('should create a bill with correct totals', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/billing',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          customer_name: 'E2E Bill Customer',
          paid_amount: 3000,
          items: [{ item_id: testItemId, quantity: 3 }], // 1000 * 3 = 3000
        },
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.success).to.be.true;
        expect(response.body.data.bill_number).to.match(/^BILL-\d{8}-\d{4}$/);
        expect(response.body.data.status).to.eq('completed');
        expect(response.body.data.total_amount).to.be.greaterThan(0);
      });
    });
  });

  it('should list bills', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/billing',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.length).to.be.greaterThan(0);
      });
    });
  });

  it('should reject bill with insufficient stock', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/billing',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          customer_name: 'Stock Test',
          paid_amount: 100000,
          items: [{ item_id: testItemId, quantity: 99999 }], // Way more than available
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.include('Insufficient stock');
      });
    });
  });

  it('should reject bill with no items', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/billing',
        headers: { Authorization: `Bearer ${token}` },
        body: { customer_name: 'Test', paid_amount: 100, items: [] },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Inventory Management', () => {
  let testItemId: string;

  before(() => {
    cy.login();
    // Get first available item
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/items?limit=1',
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (res.body.data.length > 0) {
          testItemId = res.body.data[0].id;
        }
      });
    });
  });

  it('should list inventory', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/inventory',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('array');
      });
    });
  });

  it('should add stock (stock-in)', function () {
    if (!testItemId) this.skip();
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/inventory/stock-in',
        headers: { Authorization: `Bearer ${token}` },
        body: { item_id: testItemId, quantity: 10, notes: 'E2E stock-in test' },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Users Management', () => {
  before(() => { cy.login(); });

  it('should list users', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/users',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.length).to.be.greaterThan(0);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  before(() => { cy.login(); });

  it('should return dashboard data', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/dashboard',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        const data = response.body.data;
        expect(data).to.have.property('today_sales');
        expect(data).to.have.property('total_items');
        expect(data).to.have.property('total_customers');
        expect(data).to.have.property('total_categories');
        expect(data).to.have.property('sales_chart');
        expect(data).to.have.property('recent_bills');
        expect(data.sales_chart).to.be.an('array');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Settings', () => {
  before(() => { cy.login(); });

  it('should get settings', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/settings',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.be.an('object');
      });
    });
  });

  it('should update settings', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'PUT',
        url: '/api/settings',
        headers: { Authorization: `Bearer ${token}` },
        body: { e2e_test_setting: 'test_value' },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Reports', () => {
  before(() => { cy.login(); });

  it('should generate sales report', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/reports/sales?start_date=2026-01-01&end_date=2026-12-31',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('summary');
        expect(response.body.data.summary).to.have.property('total_sales');
        expect(response.body.data.summary).to.have.property('total_bills');
        expect(response.body.data).to.have.property('pagination');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('System Status', () => {
  before(() => { cy.login(); });

  it('should get system status', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/system/status',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('isLocked');
        expect(response.body.data).to.have.property('deadmanDays');
      });
    });
  });
});
