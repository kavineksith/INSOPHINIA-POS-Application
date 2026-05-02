/**
 * E2E Tests: Authentication Flow
 * Tests login, logout, and invalid credential handling.
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
  });

  it('should display the login page', () => {
    cy.visit('/login');
    cy.get('input[name="username"], input[id="username"], input[placeholder*="username" i]').should('be.visible');
    cy.get('input[name="password"], input[id="password"], input[placeholder*="password" i]').should('be.visible');
  });

  it('should login with valid credentials', () => {
    cy.fixture('test-data').then((data) => {
      cy.visit('/login');
      cy.get('input[name="username"], input[id="username"], input[placeholder*="username" i]').type(data.adminUser.username);
      cy.get('input[name="password"], input[id="password"], input[placeholder*="password" i]').type(data.adminUser.password);
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard or change-password page
      cy.url().should('not.include', '/login');
    });
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="username"], input[id="username"], input[placeholder*="username" i]').type('wronguser');
    cy.get('input[name="password"], input[id="password"], input[placeholder*="password" i]').type('Wrong@Pass123');
    cy.get('button[type="submit"]').click();

    // Should stay on login page and show error
    cy.url().should('include', '/login');
    // Error message or toast should appear
    cy.contains(/invalid|incorrect|error/i).should('be.visible');
  });

  it('should login via API and access protected pages', () => {
    cy.login();
    cy.visit('/');
    // Should not redirect to login
    cy.url().should('not.include', '/login');
  });
});
