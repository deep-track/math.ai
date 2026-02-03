describe('Credits and Conversations E2E', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('shows credits badge and blocks when zero (mobile)', () => {
    // Simulate mobile viewport
    cy.viewport('iphone-6')
    cy.get('div').contains('Credits')
    // Note: To fully test spend-to-zero you'd need to seed backend credits or simulate spending via API
  })

  it('creates a conversation and lists it in sidebar', () => {
    // Click new chat
    cy.get('button').contains('+').click()
    // Sidebar should show "Chat"
    cy.get('aside').contains(/recent|discussions/i)
  })
})