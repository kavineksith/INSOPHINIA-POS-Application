/**
 * E2E Tests: Category Management CRUD
 * Tests creating, reading, editing, and deleting categories via the API.
 */

describe('Category Management', () => {
  let createdCategoryId: string;

  before(() => {
    cy.login();
  });

  it('should list categories via API', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: '/api/categories?limit=50',
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data).to.be.an('array');
        expect(response.body.pagination).to.have.property('total');
      });
    });
  });

  it('should create a new category', () => {
    cy.getAuthToken().then((token) => {
      const name = `E2E Category ${Date.now()}`;
      cy.request({
        method: 'POST',
        url: '/api/categories',
        headers: { Authorization: `Bearer ${token}` },
        body: { name, description: 'Created by E2E test' },
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.success).to.be.true;
        expect(response.body.data.name).to.eq(name);
        createdCategoryId = response.body.data.id;
      });
    });
  });

  it('should get category by ID', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        url: `/api/categories/${createdCategoryId}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.id).to.eq(createdCategoryId);
      });
    });
  });

  it('should update category', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'PUT',
        url: `/api/categories/${createdCategoryId}`,
        headers: { Authorization: `Bearer ${token}` },
        body: { name: `Updated E2E Category ${Date.now()}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
      });
    });
  });

  it('should reject duplicate category name', () => {
    cy.getAuthToken().then((token) => {
      // First, get an existing category to get its name
      cy.request({
        url: '/api/categories?limit=1',
        headers: { Authorization: `Bearer ${token}` },
      }).then((listResponse) => {
        if (listResponse.body.data.length > 0) {
          const existingName = listResponse.body.data[0].name;
          cy.request({
            method: 'POST',
            url: '/api/categories',
            headers: { Authorization: `Bearer ${token}` },
            body: { name: existingName },
            failOnStatusCode: false,
          }).then((response) => {
            expect(response.status).to.eq(409);
            expect(response.body.success).to.be.false;
          });
        }
      });
    });
  });

  it('should delete (soft-delete) category', () => {
    cy.getAuthToken().then((token) => {
      cy.request({
        method: 'DELETE',
        url: `/api/categories/${createdCategoryId}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
      });

      // Verify it's gone from list
      cy.request({
        url: `/api/categories/${createdCategoryId}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });
});
