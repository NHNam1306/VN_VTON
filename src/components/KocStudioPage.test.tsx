import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KocStudioPage } from './KocStudioPage'

const user = {
  id: 'creator-1',
  email: 'creator@example.com',
  displayName: 'Nguyễn Nam',
  createdAt: '2026-01-01T00:00:00.000Z',
  role: 'user' as const,
  status: 'active' as const,
}

describe('KocStudioPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves a local draft and links back to the fitting room', () => {
    const onNavigate = vi.fn()
    render(<KocStudioPage user={user} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Về phòng thử' }))
    expect(onNavigate).toHaveBeenCalledWith('fitting')

    fireEvent.click(screen.getByRole('button', { name: 'Tạo nội dung' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tiêu đề' }), {
      target: { value: 'Outfit cuối tuần' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung' }), {
      target: { value: 'Phối áo khoác với quần sáng màu.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    expect(screen.getByText('Outfit cuối tuần')).toBeInTheDocument()
    expect(screen.getByText('Phối áo khoác với quần sáng màu.')).toBeInTheDocument()
    expect(window.localStorage.getItem('tryoh:koc-drafts:creator-1')).toContain('Outfit cuối tuần')
  })
})
