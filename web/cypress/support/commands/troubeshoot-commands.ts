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
      cy.byButtonText('Signal Correlation').click()
      cy.wait(30000) // wait for 30 seconds
      // retry after small delay
      retryOpenTroubleshootPanel(count - 1)
    }
  })
}

Cypress.Commands.add('openTroubleshootPanel', () => {
  cy.window().its('document.readyState').should('eq', 'complete');
  // Retry until popup div appears.
  retryOpenTroubleshootPanel(5)
  //Wait until TopologyContainer present
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('be.visible');
})

Cypress.Commands.add('closeTroubleshootPanel', () => {
  cy.get(dt.Classes.TroubleShootPanelPopoverClose).click({force: true});
})

Cypress.Commands.add('focusTroubleshootPanel', () => {
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .contains('button', 'Focus')
    .click({force: true});
  cy.get('body').trigger('mouseover');
  cy.get('body').click(0, 0);
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('exist');
})

Cypress.Commands.add('refreshTroubleshootPanel', () => {
  //There’s smart method to locate this button
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .find('button[aria-label="Refresh"]')
    .click({force: true});
  cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('be.visible')
})

Cypress.Commands.add('clickTroubleshootPanelAdvance', () => {
  cy.get(dt.Classes.TroubleShootPanelToolBar)
    .find('div[aria-label="Advanced search parameters"]')
    .find('button')
    .click();
  cy.get(dt.Classes.TroubleShootPanelToolBarAdvanced).should('be.visible')
})

Cypress.Commands.add('getTroubleshootPanelQueryText', () => {
  //Note: The advance tab need to be expaned before run this commands.
  return cy.get(dt.Classes.TroubleShootPanelQueryInput).find('textarea#query-input').invoke('val')
})
