/**
 * Cypress Custom Commands
 * Adds reusable authentication and API helper commands.
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login via the API and set the auth cookie for subsequent requests.
       */
      login(username?: string, password?: string): Chainable<void>;

      /**
       * Get auth token from cookie for direct API calls.
       */
      getAuthToken(): Chainable<string>;
    }
  }
}

// Login command — authenticates via the API and stores the auth cookie & local storage
Cypress.Commands.add('login', (username?: string, password?: string) => {
  const user = username || Cypress.env('ADMIN_USERNAME') || 'master';
  const pass = password || Cypress.env('ADMIN_PASSWORD') || 'Password@123';

  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username: user, password: pass },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body.success) {
      const token = response.body.data.token;
      const csrfToken = 'test-e2e-csrf-bypass'; // Default fallback
      
      cy.setCookie('auth_token', token, { path: '/' });
      // Inject to localStorage directly via window
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', token);
        win.localStorage.setItem('auth_user', JSON.stringify(response.body.data.user));
      });
    } else {
      cy.log(`Login failed: ${response.body.message || 'Unknown error'}`);
    }
  });
});

// Get auth token from the cookie
Cypress.Commands.add('getAuthToken', () => {
  return cy.getCookie('auth_token').then((cookie) => {
    return cookie ? cookie.value : '';
  });
});

export {};
