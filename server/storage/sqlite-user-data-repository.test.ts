import { describe, expect, it } from 'vitest'
import type { PersonImageRecord } from '../domain/person-image.js'
import { SqliteUserDataRepository } from './sqlite-user-data-repository.js'

const userId = 'user-1'

const personImage: PersonImageRecord = {
  id: 'current',
  imageKey: 'person.jpg',
  width: 683,
  height: 1024,
  warnings: [],
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('SqliteUserDataRepository', () => {
  it('thay ảnh hiện tại và trả key cũ để dọn file', () => {
    const repository = new SqliteUserDataRepository(':memory:')
    expect(repository.upsertPersonImage(userId, personImage)).toBeNull()
    expect(repository.getPersonImage(userId)).toEqual(personImage)
    expect(repository.getPersonImage('user-2')).toBeNull()
    expect(repository.upsertPersonImage(userId, { ...personImage, imageKey: 'person-new.jpg' })).toBe('person.jpg')
    expect(repository.getPersonImage(userId)?.imageKey).toBe('person-new.jpg')
    repository.close()
  })

  it('xoá toàn bộ dữ liệu người dùng', () => {
    const repository = new SqliteUserDataRepository(':memory:')
    repository.upsertPersonImage(userId, personImage)
    expect(repository.clearAllUserData(userId).personImageKey).toBe('person.jpg')
    expect(repository.getPersonImage(userId)).toBeNull()
    repository.close()
  })

  it('lưu kết quả theo từng góc và xoá kết quả cũ khi đổi ảnh người', () => {
    const repository = new SqliteUserDataRepository(':memory:')
    repository.upsertPersonImage(userId, personImage)
    repository.upsertTryOnResult(userId, {
      angle: 'front',
      imageUrl: '/front.svg',
      imageKey: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(repository.listTryOnResults(userId)).toHaveLength(1)
    expect(repository.listTryOnResults('user-2')).toEqual([])
    repository.upsertPersonImage(userId, { ...personImage, imageKey: 'person-new.jpg' })
    expect(repository.listTryOnResults(userId)).toEqual([])
    repository.close()
  })

  it('lưu nhiều bộ ảnh hoàn chỉnh và bảo toàn key ảnh trong lịch sử', () => {
    const repository = new SqliteUserDataRepository(':memory:')
    repository.saveOutfit(userId, {
      id: 'outfit-1',
      frontImageUrl: '/uploads/front.png',
      frontImageKey: 'front.png',
      backImageUrl: '/uploads/back.png',
      backImageKey: 'back.png',
      garmentIds: ['shirt-1', 'pants-1'],
      createdAt: '2026-01-02T00:00:00.000Z',
    })

    expect(repository.listSavedOutfits(userId)).toHaveLength(1)
    expect(repository.listSavedOutfits('user-2')).toEqual([])
    expect(repository.isImageKeySaved(userId, 'front.png')).toBe(true)
    expect(repository.deleteSavedOutfit(userId, 'outfit-1')?.backImageKey).toBe('back.png')
    expect(repository.listSavedOutfits(userId)).toEqual([])
    repository.close()
  })

  it('lưu bộ một ảnh rồi cập nhật ảnh sau vào đúng mục', () => {
    const repository = new SqliteUserDataRepository(':memory:')
    const frontOnly = {
      id: 'outfit-pending',
      frontImageUrl: '/uploads/front-only.png',
      frontImageKey: 'front-only.png',
      backImageUrl: null,
      backImageKey: null,
      garmentIds: ['shirt-1'],
      createdAt: '2026-01-03T00:00:00.000Z',
    }
    repository.saveOutfit(userId, frontOnly)

    const pending = repository.findPendingOutfit(userId, frontOnly.frontImageUrl)
    expect(pending?.id).toBe(frontOnly.id)
    expect(repository.listSavedOutfits(userId)[0]?.backImageUrl).toBeNull()

    repository.saveOutfit(userId, {
      ...frontOnly,
      backImageUrl: '/uploads/back-later.png',
      backImageKey: 'back-later.png',
    })
    expect(repository.listSavedOutfits(userId)).toHaveLength(1)
    expect(repository.listSavedOutfits(userId)[0]?.backImageUrl).toBe('/uploads/back-later.png')
    expect(repository.findPendingOutfit(userId, frontOnly.frontImageUrl)).toBeNull()
    repository.close()
  })
})
