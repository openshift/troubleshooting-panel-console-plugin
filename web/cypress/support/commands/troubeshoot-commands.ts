/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
import { guidedTour } from '../../views/tour';
import * as dt from '../../fixtures/data-test';

declare global {
  namespace Cypress {
    interface IndexField {
      name: string;
      value?: string; 
    }
    interface Chainable<Subject> {
      openTroubleshootPanel();
      closeTroubleshootPanel();
      focusTroubleshootPanel();
      refreshTroubleshootPanel();
      clickTroubleshootPanelAdvance();
      getTroubleshootPanelQueryText();
    }
  }
}

/**
 * Retries opening the troubleshoot panel by clicking the application launcher
 * and "Signal correlation" button until the popup appears or max retries reached.
 * @param {number} count - Maximum number of retry attempts (default: 5)
 * @throws {Error} When popup fails to appear after all retry attempts
 */
function retryOpenTroubleshootPanel(count = 5) {
  if (count === 0) {
    throw new Error('Popup did not appear after clicking the trigger')
  }
  cy.document().then(doc => {
    const $popup = Cypress.$(dt.Classes.TroubleShootPanelPopover + ':visible', doc)
    if ($popup.length) {
      // popup appeared
      cy.log('Popup appeared')
      return
    } else {
      // Step 1: click trigger button
      cy.byLegacyTestID(dt.LegacyTestIDs.ApplicationLauncher).click()
      cy.get(dt.Classes.AppLaunchPanel).should('be.visible')
      cy.byButtonText('Signal correlation').click()
      cy.wait(30000) // wait for 30 seconds
      // retry after small delay
      retryOpenTroubleshootPanel(count - 1)
    }
  })
}

/**
 * Opens the troubleshoot panel by clicking the application launcher
 * and waits for the topology container to be visible.
 * Retries up to 5 times if the panel doesn't appear immediately.
 */
Cypress.Commands.add('openTroubleshootPanel', () => {
  cy.window().its('document.readyState').should('eq', 'complete');
  // Retry until popup div appears.
  retryOpenTroubleshootPanel(5)
  //Wait until TopologyContainer present
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('be.visible');
})

/**
 * Closes the troubleshoot panel by clicking the close button.
 * Note: stale/hidden popover instances can linger in the DOM after being
 * closed previously, so we scope to the currently visible one to avoid
 * matching more than one element.
 */
Cypress.Commands.add('closeTroubleshootPanel', () => {
  cy.get(dt.Classes.TroubleShootPanelPopoverClose + ':visible').click({force: true});
})

/**
 * Focuses the troubleshoot panel by clicking the Focus button
 * and triggers mouse events to ensure proper focus state.
 */
Cypress.Commands.add('focusTroubleshootPanel', () => {
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .contains('button', 'Focus')
    .click({force: true});
  cy.get('body').trigger('mouseover');
  cy.get('body').click(0, 0);
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('exist');
})

/**
 * Refreshes the troubleshoot panel by clicking the refresh button
 * and waits for the topology container to be visible.
 */
Cypress.Commands.add('refreshTroubleshootPanel', () => {
  //There’s smart method to locate this button
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .find('button[aria-label="Refresh"]')
    .click({force: true});
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('be.visible')
})

/**
 * Opens the advanced search parameters section in the troubleshoot panel
 * by clicking the advanced search button and waits for the section to be visible.
 */
Cypress.Commands.add('clickTroubleshootPanelAdvance', () => {
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .find('div[aria-label="Advanced search parameters"]')
    .find('button')
    .click();
  cy.get(dt.Classes.TroubleShootPanelToolBarAdvanced).should('be.visible')
})

/**
 * Gets the current query text from the troubleshoot panel's query input.
 * Note: The advanced search section must be expanded before calling this command.
 * @returns {Cypress.Chainable<string>} The query text value
 */
Cypress.Commands.add('getTroubleshootPanelQueryText', () => {
  //Note: The advance tab need to be expaned before run this commands.
  return cy.get(dt.Classes.TroubleShootPanelQueryInput).find('textarea#query-input').invoke('val')
})
