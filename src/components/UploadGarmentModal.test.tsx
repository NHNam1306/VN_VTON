import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadGarmentModal } from './UploadGarmentModal'

describe('UploadGarmentModal', () => {
  it('uses the selected wardrobe tab as the category without asking again', () => {
    render(
      <UploadGarmentModal
        open
        defaultCategory="bottoms"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Thêm quần' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên quần')).toHaveAttribute('placeholder', 'Ví dụ: Quần jeans xanh')
    expect(screen.getByRole('button', { name: 'Lưu quần' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tách nền' })).toBeInTheDocument()
    expect(screen.queryByText(/AI & FLUX/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Kiểm tra hình ảnh/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Xem trước & Tái tạo/i)).not.toBeInTheDocument()
    expect(screen.getByText('Trước · Gốc')).toBeInTheDocument()
    expect(screen.getByText('Trước · Đã tách')).toBeInTheDocument()
    expect(screen.getByText('Sau · Gốc')).toBeInTheDocument()
    expect(screen.getByText('Sau · Đã tách')).toBeInTheDocument()
    expect(screen.queryByText('Loại đồ')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Áo' })).not.toBeInTheDocument()
    // Không còn các checkbox tách set thủ công
    expect(screen.queryByLabelText(/Tách cả set/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tách phụ kiện/i)).not.toBeInTheDocument()
  })

  it('khóa khung tách nền và hiển thị đầy đủ 4 ô xem trước', () => {
    const { container } = render(
      <UploadGarmentModal
        open
        defaultCategory="tops"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    // Khung tách nền bên trái có class overflow-hidden (khóa scroll)
    const leftCol = container.querySelector('.lg\\:grid-cols-\\[330px_minmax\\(0\\,1fr\\)\\] > div:first-child')
    expect(leftCol).toHaveClass('overflow-hidden')

    // Cột ảnh bên phải có class overflow-y-auto (cho phép scroll)
    const rightCol = container.querySelector('.lg\\:grid-cols-\\[330px_minmax\\(0\\,1fr\\)\\] > div:last-child')
    expect(rightCol).toHaveClass('overflow-y-auto')
  })
})
