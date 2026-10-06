import * as dt from '../fixtures/data-test'
import { DataTestIDs } from '../fixtures/data-test';

describe('TroubleShoot Test', { tags: ['@admin'] }, () => {
  before( function() {
    cy.uiLoginAsClusterAdminForUser("first");
    cy.openTroubleshootPanel();

  });

  after( function() {
    cy.closeTroubleshootPanel();
    cy.uiLogoutClusterAdminForUser("first");
  });
  
  it('Essential elements validation when focus on Alerting',{tags:['@troubleshooting-panel']}, () => {
    cy.clickNavLink(['Observe', 'Alerting']);
    cy.openTroubleshootPanel();

    //Elements in Title
    cy.get(dt.Classes.TroubleShootPanelPopoverTitleBar)
      .should('exist')
      .within(() => {
	cy.contains('h1', 'Troubleshooting');
	cy.get('h1').find('button').should('exist')
	cy.get('button[aria-label="Close"]').should('exist');
	cy.get(dt.Classes.TroubleShootPanelPopoverClose).should('exist');
      })

    //Elements in Toolbar
    cy.get(dt.Classes.TroubleShootPanelToolBar)
      .should('exist')
      .within(() => {
        cy.contains('button','Focus');
	//timepicker button
	cy.contains('button', 'Last 1 hours');
	//Advanced button
	cy.get('div[aria-label="Advanced search parameters"]').should('exist');
	//The refresh button exists
	cy.get('button[aria-label="Refresh"]').should('exist');
      })

    //focus on Observe->Alerting
    cy.focusTroubleshootPanel();

    //Elements under in Advance Container
    cy.clickTroubleshootPanelAdvance();
    cy.get(dt.Classes.TroubleShootPanelToolBarAdvanced)
      .find('form')
      .within(() => {
        cy.contains('label', 'Start Query');
	cy.contains('div', 'Select starting data');
        cy.get('textarea[id="query-input"]')
	  .should('exist')
	  .should('have.value', 'alert:alert:{}');
        cy.contains('label', 'Search Type');
	cy.contains('div', 'Neighbours or Goal search');
	cy.contains('button', 'Neighbours');
	cy.get('button[aria-label="Minus"]').should('exist');
	cy.get('input[value="3"]').should('exist');
	cy.get('button[aria-label="Plus"]').should('exist');
	cy.contains('div', 'hops');
	cy.contains('button', 'Search');
	cy.contains('button', 'Cancel');
      });

    //Elements under in topology-container
    cy.get(dt.Classes.TroubleShootPanelTopologyContainer).should('exist');
    cy.get('div[data-test-id="topology"]').should('exist');
    cy.get('g[data-id="korrel8r_graph"]')
      .within(() => {
        cy.get('ellipse').should('exist'); // node
        cy.get(dt.Classes.TroubleShootPanelTopologyNodeLabel).should('exist'); // text panels
        cy.get(dt.Classes.TroubleShootPanelTopologyNodeBackGroud).should('exist'); //backgroup panels
        cy.get('g[data-test-id="edge-handler"]').should('exist'); // lines
      })
    cy.get(dt.Classes.TroubleShootPanelTopologyGraphControlBar)
      .within(() => {
        cy.get('button[id="zoom-in"]').should('exist');
        cy.get('button[id="zoom-out"]').should('exist');
        cy.get('button[id="reset-view"]').should('exist');
      })
    //Two nodes in topology-container when focus on Observe->alerting
    cy.get('g[data-id="korrel8r_graph"]') // get the parent <g>
      .find('g[data-id="alert:alert"]') // find the child <g>
      .should('exist')
      .find('text')
      .contains('Alert')
      .should('exist')
    cy.get('g[data-id="korrel8r_graph"]') // get the parent <g>
      .find('g[data-id="metric:metric"]') // find the child <g>
      .should('exist')
      .find('text')
      .contains('Metric')
      .should('exist')

    //Close the troubleshoot panel
    cy.closeTroubleshootPanel();
  });

  it('Troubleshooting Panel link on Alert Details page',{tags:['@troubleshooting-panel']}, () => {
    cy.clickNavLink(['Observe', 'Alerting']);
    cy.changeNamespace('All Projects');
    cy.log('listPage.filter.byName');
      try {
        cy.log('listPage.filter.selectAttribute');
        cy.byOUIAID('DataViewFilters').scrollIntoView();
        cy.byOUIAID('DataViewFilters')
        .find('.pf-v6-c-menu-toggle')
        .first()
        .then(($toggle) => {
          if (!$toggle.text().includes('Name')) {
            cy.wrap($toggle).click();
            cy.get('.pf-v6-c-menu__item').contains('Name').click();
          }
        });
        cy.byOUIAID('AlertNameFilter-input')
          .find('input')
          .scrollIntoView()
          .as('input')
          .should('be.visible');
        cy.get('@input', { timeout: 10000 })
          .scrollIntoView()
          .type('Watchdog' + '{enter}');
        cy.get('@input', { timeout: 10000 }).scrollIntoView().should('have.attr', 'value', 'Watchdog');
        cy.wait(2000);
      } catch (error: any) {
        cy.log(`${error.message}`);
        throw error;
      }
    cy.log('listPage.ARRows.expandRow');
      try {
        cy.get('body').then(($provider) => {
          if ($provider.find(dt.Classes.ExpandedRow).length > 0) {
            cy.log('Already expanded');
          } else {
            cy.byTestID(dt.DataTestIDs.AlertingRuleArrow).first().find('button').click();
          }
        });
      } catch (error: any) {
        cy.log(`${error.message}`);
        throw error;
      }
    cy.log('listPage.ARRows.clickAlert');
      try {
        cy.byTestID(dt.DataTestIDs.AlertResourceLink).should('be.visible').click();
      } catch (error: any) {
        cy.log(`${error.message}`);
        throw error;
      }
    cy.log('assert troubleshooting panel link on Alert Details page');
    cy.byButtonText('Troubleshooting Panel').should('exist');
    cy.byButtonText('Troubleshooting Panel').click();
    // Scope to the visible popover: a previously-closed panel instance can
    // leave a hidden/stale node behind that still matches this selector.
    cy.get(dt.Classes.TroubleShootPanelPopoverTitleBar + ':visible')
      .should('exist')
      .within(() => {
        cy.contains('h1', 'Troubleshooting');
        cy.get('h1').find('button').should('exist')
        cy.get('button[aria-label="Close"]').should('exist');
      })
    
  });
});
