import { useCallback, useEffect, useMemo, useState } from 'react'
import { tryOnApi } from '../services/try-on-api'
import { useFittingRoomStore } from '../store/useFittingRoomStore'
import type { AngleGenerationState, SavedOutfit, TryOnAngle, TryOnResult } from '../types/fitting-room'

const angles: TryOnAngle[] = ['front', 'back']

const createInitialState = (): Record<TryOnAngle, AngleGenerationState> => ({
  front: { status: 'idle', result: null, error: null },
  back: { status: 'idle', result: null, error: null },
})

export function useTryOnGeneration() {
  const [states, setStates] = useState(createInitialState)
  const [history, setHistory] = useState<SavedOutfit[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const outfit = useFittingRoomStore((state) => state.outfit)
  const preservePoseFront = useFittingRoomStore((state) => state.preservePoseFront)
  const preservePoseBack = useFittingRoomStore((state) => state.preservePoseBack)
  const privacyConsent = useFittingRoomStore((state) => state.privacyConsent)
  const garmentIds = useMemo(
    () =>
      [outfit.tops, outfit.outerwear, outfit.bottoms, outfit.shoes, ...outfit.accessories].filter(
        (id): id is string => Boolean(id),
      ),
    [outfit],
  )

  const refreshHistory = useCallback(async () => {
    setHistoryError(null)
    try {
      setHistory(await tryOnApi.listOutfits())
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Không thể tải Bộ đồ của tôi.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([tryOnApi.listResults(), tryOnApi.listOutfits()])
      .then(([results, outfits]) => {
        setStates((current) => {
          const next = { ...current }
          results.forEach((result) => {
            next[result.angle] = { status: 'success', result, error: null }
          })
          return next
        })
        setHistory(outfits)
      })
      .catch((error: unknown) => {
        setHistoryError(error instanceof Error ? error.message : 'Không thể tải dữ liệu kết quả.')
      })
      .finally(() => setIsHistoryLoading(false))
  }, [])

  const runAngle = useCallback(async (angle: TryOnAngle, ids: string[]) => {
    setStates((current) => ({
      ...current,
      [angle]: { ...current[angle], status: 'loading', error: null },
    }))
    try {
      const preservePose = angle === 'front' ? preservePoseFront : preservePoseBack
      const result = await tryOnApi.generateAngle(angle, ids, preservePose, privacyConsent)
      setStates((current) => ({
        ...current,
        [angle]: { status: 'success', result, error: null },
      }))
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo ảnh.'
      setStates((current) => ({
        ...current,
        [angle]: { ...current[angle], status: 'error', error: message },
      }))
      throw error
    }
  }, [preservePoseFront, preservePoseBack, privacyConsent])

  const generateAll = useCallback(async () => {
    if (!garmentIds.length) return
    setStates(createInitialState())
    try {
      await runAngle('front', garmentIds)
      await refreshHistory()
    } catch {
      setStates((current) => {
        return {
          ...current,
          back: {
            status: 'error',
            result: null,
            error: 'Ảnh TRƯỚC chưa thành công.',
          },
        }
      })
    }
  }, [garmentIds, refreshHistory, runAngle])

  const regenerate = useCallback(async (angle: TryOnAngle) => {
    if (!garmentIds.length) return
    if (angle === 'front') {
      setStates((current) => ({
        ...current,
        back: { status: 'idle', result: null, error: null },
      }))
    }
    try {
      await runAngle(angle, garmentIds)
      await refreshHistory()
    } catch {
      // ResultStage hiển thị lỗi và cho phép thử lại.
    }
  }, [garmentIds, refreshHistory, runAngle])

  const deleteOutfit = useCallback(async (id: string) => {
    await tryOnApi.deleteOutfit(id)
    setHistory((current) => current.filter((outfit) => outfit.id !== id))
  }, [])

  return {
    states,
    generateAll,
    regenerate,
    history,
    isHistoryLoading,
    historyError,
    deleteOutfit,
    clearResults: () => setStates(createInitialState()),
    clearAllResults: () => {
      setStates(createInitialState())
      setHistory([])
      setHistoryError(null)
    },
    isGenerating: angles.some((angle) => states[angle].status === 'loading'),
  }
}
