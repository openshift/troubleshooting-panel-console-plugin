import { Classes } from '../fixtures/data-test';
export const nav = {
  sidenav: {
    /**
     * Clicks a navigation link in the sidebar.
     * @param {string[]} path - The navigation path to click
     */
    clickNavLink: (path: string[]) => {
      cy.log('Click navLink - ' + `${path}`);
      cy.clickNavLink(path);
    },
    switcher: {
      /**
       * Changes the console perspective, trying multiple perspective names in order.
       * @param {...string} perspectives - One or more perspective names to try
       */
      changePerspectiveTo: (...perspectives: string[]) => {
        cy.get('body').then((body) => {
          if (body.find('button[data-test-id="perspective-switcher-toggle"]:visible').length > 0) {
            cy.byLegacyTestID('perspective-switcher-toggle').scrollIntoView().click({ force: true });

            cy.get('[data-test-id="perspective-switcher-menu-option"]').then(($options) => {
              const foundPerspective = perspectives.find(p => $options.text().includes(p));
              if (foundPerspective) {
                cy.byLegacyTestID('perspective-switcher-menu-option')
                  .contains(foundPerspective)
                  .click({ force: true });
              } else {
                cy.log('No matching perspective found');
                cy.get('body').type('{esc}');
              }
            });

          }
        });
      },
      /**
       * Asserts that the perspective switcher displays the given perspective name.
       * @param {string} perspective - The expected perspective name
       */
      shouldHaveText: (perspective: string) => {
        cy.log('Should have text - ' + `${perspective}`);
        cy.byLegacyTestID('perspective-switcher-toggle').contains(perspective).should('be.visible');
      }
    }
  },
  tabs: {
    /**
     * Switches to a tab by name in the horizontal navigation.
     * @param {string} tabname - The name of the tab to switch to
     */
    switchTab: (tabname: string) => {
      cy.get(Classes.HorizontalNav).contains(tabname).should('be.visible').click();
  }
}
};
