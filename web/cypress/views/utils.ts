/**
 * Clicks an element if it exists in the DOM.
 * @param {string} element - The element selector to click
 */
export function clickIfExist(element) {
  cy.get('body').then((body) => {
    if (body.find(element).length > 0) {
      cy.get(element).click();
    }
  });
}

/**
 * Gets the value from a form input element.
 * @param {string} selector - The element selector
 * @returns {Cypress.Chainable<string>} The element's value
 */
export function getValFromElement(selector: string) {
  cy.log('Get Val from Element');
  cy.get(selector).should('be.visible');
  const elementText = cy.get(selector).invoke('val');
  return elementText;
}

/**
 * Gets the text content from an element.
 * @param {string} selector - The element selector
 * @returns {Cypress.Chainable<string>} The element's text content
 */
export function getTextFromElement(selector: string) {
  cy.log('Get Text from Element');
  cy.get(selector).should('be.visible');
  const elementText = cy.get(selector).invoke('text');
  return elementText;
}

/**
 * Detects and returns the PatternFly version (v5 or v6) being used.
 * Checks HTML classes and CSS variables to determine the version.
 * @returns {string} The PatternFly version ('v5', 'v6', or default 'v6')
 */
export function getPFVersion() {
  // Detect PatternFly version from document classes or CSS variables
  const htmlElement = Cypress.$('html')[0];
  if (htmlElement) {
    const classes = htmlElement.className;
    const versionMatch = classes.match(/pf-(v\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }
  // Fallback to checking for CSS variables
  const style = getComputedStyle(document.documentElement);
  if (style.getPropertyValue('--pf-v6-global--FontSize--md')) {
    return 'v6';
  } else if (style.getPropertyValue('--pf-v5-global--FontSize--md')) {
    return 'v5';
  }
  // Default to current version
  return 'v6';
}
