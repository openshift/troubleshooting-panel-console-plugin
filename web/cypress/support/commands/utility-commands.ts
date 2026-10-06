import { Classes, DataTestIDs, LegacyTestIDs } from "../../fixtures/data-test";
export {};

declare global {
    namespace Cypress {
      interface Chainable {
        waitUntilWithCustomTimeout(
          fn: () => any,
          options: { interval: number; timeout: number; timeoutMessage: string }
        ): Cypress.Chainable<any>;
        clickNavLink(path: string[]): Chainable<Element>;
        changeNamespace(namespace: string): Chainable<Element>;
        aboutModal(): Chainable<Element>;
        podImage(pod: string, namespace: string): Chainable<Element>;
        }
    }
  }

/**
 * Custom waitUntil command with configurable timeout message.
 * Waits for a condition to be true with custom error messaging on timeout.
 * @param {Function} fn - The condition function to check repeatedly
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Check interval in milliseconds
 * @param {number} options.timeout - Maximum wait time in milliseconds
 * @param {string} options.timeoutMessage - Custom error message on timeout
 * @returns {Cypress.Chainable<any>} Chainable Cypress command
 */
Cypress.Commands.add('waitUntilWithCustomTimeout', (
    fn: () => any,
    options: { interval: number; timeout: number; timeoutMessage: string }
  ) => {
    const { timeoutMessage, ...waitOptions } = options;
  
    // Set up custom error handling before the waitUntil call
    cy.on('fail', (err) => {
      if (err.message.includes('Timed out retrying')) {
        // Create a new error with the custom message
        const customError = new Error(timeoutMessage);
        customError.stack = err.stack;
        throw customError;
      }
      // For any other errors, re-throw them unchanged
      throw err;
    });
  
    // Execute the waitUntil with the original options (without timeoutMessage)
    return cy.waitUntil(fn, waitOptions);
  
  });


/**
 * Clicks a navigation link in the sidebar by path.
 * Expands parent navigation items if needed.
 * @param {string[]} path - Array of navigation labels (max 2 levels: [parent] or [parent, child])
 */
Cypress.Commands.add('clickNavLink', (path: string[]) => {
  cy.get('#page-sidebar')
    .contains(path[0])
    .then(($navItem) => {
      if ($navItem.attr('aria-expanded') !== 'true') {
        cy.wrap($navItem).click({force: true});
      }
    });
  if (path.length === 2) {
    cy.get('#page-sidebar')
      .contains(path[1])
      .click({force: true});
  }
});

/**
 * Changes the active namespace/project in the OpenShift Console.
 * Handles both legacy and current namespace dropdown implementations.
 * Automatically enables "Show system namespaces" if needed.
 * @param {string} namespace - The namespace name to switch to
 */
Cypress.Commands.add('changeNamespace', (namespace: string) => {
  cy.log('Changing Namespace to: ' + namespace);
  cy.wait(2000);
  cy.get('body').then(($body) => {
    const hasNamespaceBarDropdown = $body.find('[data-test-id="'+LegacyTestIDs.NamespaceBarDropdown+'"]').length > 0;
    if (hasNamespaceBarDropdown) {
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible');
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible').click({force: true});
    } else {
      cy.get(Classes.NamespaceDropdown).scrollIntoView().should('be.visible');
      cy.get(Classes.NamespaceDropdown).scrollIntoView().should('be.visible').click({force: true});
    }
  });
  cy.get('body').then(($body) => {
    const hasShowSystemSwitch = $body.find('[data-test="'+DataTestIDs.NamespaceDropdownShowSwitch+'"]').length > 0;
    if (hasShowSystemSwitch) {
      cy.get('[data-test="'+DataTestIDs.NamespaceDropdownShowSwitch+'"]').then(($element)=> {
        if ($element.attr('data-checked-state') !== 'true') {
          cy.byTestID(DataTestIDs.NamespaceDropdownShowSwitch).siblings('span').eq(0).should('be.visible');
          cy.byTestID(DataTestIDs.NamespaceDropdownShowSwitch).siblings('span').eq(0).should('be.visible').click({force: true});
        }
      });
    }
  });
  cy.byTestID(DataTestIDs.NamespaceDropdownTextFilter).type(namespace, {delay: 100});
  cy.byTestID(DataTestIDs.NamespaceDropdownMenuLink).contains(namespace).should('be.visible');
  cy.byTestID(DataTestIDs.NamespaceDropdownMenuLink).contains(namespace).should('be.visible').click({force: true});
  cy.log('Namespace changed to: ' + namespace);
});

/**
 * Opens the About modal to retrieve and log the OpenShift version.
 * Only works when logged in as kubeadmin user.
 */
Cypress.Commands.add('aboutModal', () => {
  cy.log('Getting OCP version');
  if (Cypress.env('LOGIN_USERNAME') === 'kubeadmin') {
    cy.byTestID(DataTestIDs.MastHeadHelpIcon).should('be.visible');
    cy.byTestID(DataTestIDs.MastHeadHelpIcon).should('be.visible').click({force: true});
    cy.byTestID(DataTestIDs.MastHeadApplicationItem).contains('About').should('be.visible').click();
    cy.byAriaLabel('About modal').find('div[class*="co-select-to-copy"]').eq(0).should('be.visible').then(($ocpversion) => {
      cy.log('OCP version: ' + $ocpversion.text());
    });
    cy.byAriaLabel('Close Dialog').should('be.visible').click();
  }
});

/**
 * Overrides the default cy.log behavior to also log to terminal in headless mode with DEBUG enabled.
 * In headed mode, uses the standard cy.log behavior.
 * @param {Function} log - The original cy.log function
 * @param {...any} args - Arguments to log
 * @returns {Cypress.Chainable} Chainable result
 */
Cypress.Commands.overwrite('log', (log, ...args) => {
  if (Cypress.browser.isHeadless && Cypress.env('DEBUG')) {
    // Log to the terminal using the custom task
    return cy.task('log', args, { log: false }).then(() => {
      // The original cy.log is still executed but its output is hidden from the
      // command log in headless mode
      return log(...args);
    });
  } else {
    // In headed mode, use the original cy.log behavior
    return log(...args);
  }
});

/**
 * Retrieves and logs the container image used by a specific pod.
 * Navigates to the Pods page, filters by pod name, and extracts the image information.
 * @param {string} pod - The pod name to look up
 * @param {string} namespace - The namespace containing the pod
 */
Cypress.Commands.add('podImage', (pod: string, namespace: string) => {
  cy.log('Get pod image');
  cy.switchPerspective('Core platform', 'Administrator');
  cy.wait(5000);
  cy.clickNavLink(['Workloads', 'Pods']);
  cy.changeNamespace(namespace);
  cy.byTestID('page-heading').contains('Pods').should('be.visible');
  cy.wait(5000);
    // Check for DataViewFilters component using Cypress's built-in retry-ability
    cy.get('body').then(($body) => {
      const hasDataViewFilters = $body.find('[data-ouia-component-id="DataViewFilters"]').length > 0;
      if (hasDataViewFilters) {
        cy.byOUIAID('DataViewFilters').find('button').contains('Status').scrollIntoView().should('be.visible').click();
        cy.byOUIAID('OUIA-Generated-Menu').find('button').contains('Name').scrollIntoView().should('be.visible').click();
        cy.byAriaLabel('Name filter').scrollIntoView().should('be.visible').type(pod);
      } else {
        cy.byTestID('name-filter-input').should('be.visible').type(pod);
      }
    });
    cy.get(`a[data-test^="${pod}"]`).eq(0).as('podLink').click();
      cy.get('@podLink').should('be.visible').click();
      cy.byPFRole('rowgroup').find('td').eq(1).scrollIntoView().should('be.visible').then(($td) => {
        cy.log('Pod image: ' + $td.text());
      });
      cy.log('Get pod image completed');
  });


/**
 * Asserts whether a namespace exists in the namespace dropdown.
 * Opens the namespace dropdown, searches for the namespace, and verifies its presence or absence.
 * @param {string} namespace - The namespace name to check
 * @param {boolean} exists - Whether the namespace should exist (true) or not exist (false)
 */
Cypress.Commands.add('assertNamespace', (namespace: string, exists: boolean) => {
  cy.log('Asserting Namespace: ' + namespace + ' exists: ' + exists);
  cy.wait(2000);
  cy.get('body').then(($body) => {
    const hasNamespaceBarDropdown = $body.find('[data-test-id="'+LegacyTestIDs.NamespaceBarDropdown+'"]').length > 0;
    if (hasNamespaceBarDropdown) {
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible');
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible').click({force: true});
    } else {
      cy.get(Classes.NamespaceDropdown).scrollIntoView().should('be.visible');
      cy.get(Classes.NamespaceDropdown).scrollIntoView().should('be.visible').click({force: true});
    }
  });
  cy.get('body').then(($body) => {
    const hasShowSystemSwitch = $body.find('[data-test="'+DataTestIDs.NamespaceDropdownShowSwitch+'"]').length > 0;
    if (hasShowSystemSwitch) {
      cy.get('[data-test="'+DataTestIDs.NamespaceDropdownShowSwitch+'"]').then(($element)=> {
        if ($element.attr('data-checked-state') !== 'true') {
          cy.byTestID(DataTestIDs.NamespaceDropdownShowSwitch).siblings('span').eq(0).should('be.visible');
          cy.byTestID(DataTestIDs.NamespaceDropdownShowSwitch).siblings('span').eq(0).should('be.visible').click({force: true});
        }
      });
    }
  });
  cy.byTestID(DataTestIDs.NamespaceDropdownTextFilter).type(namespace, {delay: 100});
  if (exists) {
    cy.log('Namespace: ' + namespace + ' exists');
    cy.byTestID(DataTestIDs.NamespaceDropdownMenuLink).contains(namespace).should('be.visible');
  } else {
    cy.log('Namespace: ' + namespace + ' does not exist');
    cy.byTestID(DataTestIDs.NamespaceDropdownMenuLink).should('not.exist');
  }

  cy.get('body').then(($body) => {
    const hasNamespaceBarDropdown = $body.find('[data-test-id="'+LegacyTestIDs.NamespaceBarDropdown+'"]').length > 0;
    if (hasNamespaceBarDropdown) {
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible');
      cy.byLegacyTestID(LegacyTestIDs.NamespaceBarDropdown).find('button').scrollIntoView().should('be.visible').click({force: true});
    } else {
      cy.get(Classes.NamespaceDropdownExpanded).scrollIntoView().should('be.visible');
      cy.get(Classes.NamespaceDropdownExpanded).scrollIntoView().should('be.visible').click({force: true});
    }
  });
});
