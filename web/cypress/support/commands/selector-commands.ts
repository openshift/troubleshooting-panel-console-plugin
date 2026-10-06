import Loggable = Cypress.Loggable;
import Timeoutable = Cypress.Timeoutable;
import Withinable = Cypress.Withinable;
import Shadow = Cypress.Shadow;

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      byTestID(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<Element>;
      byTestActionID(selector: string): Chainable<JQuery<HTMLElement>>;
      byLegacyTestID(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      byButtonText(selector: string): Chainable<JQuery<HTMLElement>>;
      byDataID(selector: string): Chainable<JQuery<HTMLElement>>;
      byTestSelector(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      byTestDropDownMenu(selector: string): Chainable<JQuery<HTMLElement>>;
      byTestOperatorRow(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      byTestSectionHeading(selector: string): Chainable<JQuery<HTMLElement>>;
      byTestOperandLink(selector: string): Chainable<JQuery<HTMLElement>>;
      byOUIAID(selector: string): Chainable<Element>;
      byClass(selector: string): Chainable<Element>;
      bySemanticElement(element: string, text?: string): Chainable<JQuery<HTMLElement>>;
      byAriaLabel(
        label: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      byPFRole(
        role: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

/**
 * Selects elements by data-test attribute.
 * @param {string} selector - The data-test value to select
 * @param {Object} options - Optional Cypress query options
 * @returns {Cypress.Chainable<Element>} The matched element(s)
 */
Cypress.Commands.add(
  'byTestID',
  (selector: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    return cy.get(`[data-test="${selector}"]`, options);
  },
);

/**
 * Selects non-disabled elements by data-test-action attribute.
 * @param {string} selector - The data-test-action value to select
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched non-disabled element(s)
 */
Cypress.Commands.add('byTestActionID', (selector: string) =>
  cy.get(`[data-test-action="${selector}"]:not([disabled])`),
);

/**
 * Selects elements by legacy data-test-id attribute.
 * @deprecated Use byTestID with data-test attribute instead
 * @param {string} selector - The data-test-id value to select
 * @param {Object} options - Optional Cypress query options
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched element(s)
 */
Cypress.Commands.add(
  'byLegacyTestID',
  (selector: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    return cy.get(`[data-test-id="${selector}"]`, options);
  },
);

/**
 * Selects button elements by their text content.
 * @param {string} selector - The button text to match
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched button element(s)
 */
Cypress.Commands.add('byButtonText', (selector: string) => {
  return cy.get('button[type="button"]').contains(`${selector}`);
});

/**
 * Selects elements by data-id attribute.
 * @param {string} selector - The data-id value to select
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched element(s)
 */
Cypress.Commands.add('byDataID', (selector: string) => {
  return cy.get(`[data-id="${selector}"]`);
});

/**
 * Selects elements by data-test-selector attribute.
 * @param {string} selector - The data-test-selector value to select
 * @param {Object} options - Optional Cypress query options
 */
Cypress.Commands.add(
  'byTestSelector',
  (selector: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    cy.get(`[data-test-selector="${selector}"]`, options);
  },
);

/**
 * Selects elements by data-test-dropdown-menu attribute.
 * @param {string} selector - The data-test-dropdown-menu value to select
 */
Cypress.Commands.add('byTestDropDownMenu', (selector: string) => {
  cy.get(`[data-test-dropdown-menu="${selector}"]`);
});

/**
 * Selects operator row elements by data-test-operator-row attribute.
 * @param {string} selector - The data-test-operator-row value to select
 * @param {Object} options - Optional Cypress query options
 */
Cypress.Commands.add('byTestOperatorRow', (selector: string, options?: object) => {
  cy.get(`[data-test-operator-row="${selector}"]`, options);
});

/**
 * Selects section heading elements by data-test-section-heading attribute.
 * @param {string} selector - The data-test-section-heading value to select
 */
Cypress.Commands.add('byTestSectionHeading', (selector: string) => {
  cy.get(`[data-test-section-heading="${selector}"]`);
});

/**
 * Selects operand link elements by data-test-operand-link attribute.
 * @param {string} selector - The data-test-operand-link value to select
 */
Cypress.Commands.add('byTestOperandLink', (selector: string) => {
  cy.get(`[data-test-operand-link="${selector}"]`);
});

/**
 * Selects elements by OUIA (Open UI Automation) component ID using starts-with matching.
 * @param {string} selector - The data-ouia-component-id prefix to match
 * @returns {Cypress.Chainable<Element>} The matched element(s)
 */
Cypress.Commands.add('byOUIAID', (selector: string) =>
  cy.get(`[data-ouia-component-id^="${selector}"]`),
);

/**
 * Selects elements by exact class name match.
 * @param {string} selector - The exact class name to match
 * @returns {Cypress.Chainable<Element>} The matched element(s)
 */
Cypress.Commands.add('byClass', (selector: string) => cy.get(`[class="${selector}"]`));

/**
 * Selects elements by semantic HTML element name, optionally filtered by text content.
 * @param {string} element - The HTML element selector (e.g., 'button', 'h1')
 * @param {string} text - Optional text content to filter by
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched element(s)
 */
Cypress.Commands.add('bySemanticElement', (element: string, text?: string) => {
  if (text) {
    return cy.get(element).contains(text);
  }
  return cy.get(element);
});

/**
 * Selects elements by aria-label attribute for accessibility testing.
 * @param {string} label - The aria-label value to match
 * @param {Object} options - Optional Cypress query options
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched element(s)
 */
Cypress.Commands.add(
  'byAriaLabel',
  (label: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    return cy.get(`[aria-label="${label}"]`, options);
  },
);

/**
 * Selects PatternFly elements by ARIA role attribute.
 * @param {string} role - The ARIA role value to match (e.g., 'button', 'dialog')
 * @param {Object} options - Optional Cypress query options
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} The matched element(s)
 */
Cypress.Commands.add(
  'byPFRole',
  (role: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    return cy.get(`[role="${role}"]`, options);
  },
);
