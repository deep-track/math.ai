import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatMessage from '../ChatMessage'
import * as api from '../../../services/api'
import { vi } from 'vitest'

vi.mock('../../../services/api')
vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ getToken: async () => 'fake-token' }),
  useUser: () => ({ user: null }),
}))

describe('ChatMessage', () => {
  test('retry triggers submit again after failure', async () => {
    // Mock createConversation and getConversationHistory
    (api.createConversation as any).mockResolvedValue({ id: 'conv-1' })
    (api.getConversationHistory as any).mockResolvedValue({ messages: [] })

    // Mock solveProblemStream: first call will throw, second call will yield final solution
    let call = 0
    (api.solveProblemStream as any).mockImplementation(async function* () {
      call += 1
      if (call === 1) throw new Error('Network error')
      yield { content: 'Answer', finalAnswer: 'Answer', status: 'ok' }
    })

    render(<ChatMessage />)

    // Enter a question and press Enter
    const textarea = await screen.findByPlaceholderText(/ask/i)
    await userEvent.type(textarea, '2+2')
    await userEvent.keyboard('{Enter}')

    // After failure, ErrorDisplay should show and have a Try Again button
    await waitFor(() => expect(screen.getByText(/Unable to Solve|Failed to solve/i)).toBeInTheDocument())

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(tryAgainBtn)

    // After retry, the solution should appear
    await waitFor(() => expect(screen.getByText('Answer')).toBeInTheDocument())
  })
})