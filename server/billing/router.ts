import { Router, type Request } from 'express'
import type { BillingService } from './billing-service.js'

export const createBillingWebhookRouter = (billing: BillingService) => {
  const router = Router()
  router.post('/payos', async (request, response, next) => {
    try {
      await billing.handlePayosWebhook(request.body as Record<string, unknown>)
      response.status(204).end()
    } catch (error) { next(error) }
  })
  router.post('/momo', async (request, response, next) => {
    try {
      await billing.handleMomoWebhook(request.body as Record<string, unknown>)
      response.status(204).end()
    } catch (error) { next(error) }
  })
  return router
}

// Builds distributed through Google Play / App Store send `X-Client-Channel: store`.
// Store policies require their own billing for digital goods, so external
// gateways (VietQR/payOS, MoMo) are never offered to those builds.
const isStoreBuild = (request: Request) => request.get('x-client-channel')?.trim().toLowerCase() === 'store'

export const createBillingRouter = (billing: BillingService) => {
  const router = Router()
  router.get('/providers', (request, response) => { response.json({ providers: isStoreBuild(request) ? [] : billing.providers() }) })
  router.get('/ledger.xlsx', async (request, response, next) => {
    try {
      const workbook = await billing.exportLedger(request.authUser)
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.setHeader('Content-Disposition', 'attachment; filename="tryoh-payment-transactions.xlsx"')
      response.setHeader('Cache-Control', 'private, no-store')
      response.send(workbook)
    } catch (error) { next(error) }
  })
  router.post('/checkout', async (request, response, next) => {
    try {
      if (isStoreBuild(request)) {
        response.status(403).json({ message: 'Bản ứng dụng trên cửa hàng chưa hỗ trợ mua gói.', code: 'store_billing_required' })
        return
      }
      response.status(201).json(await billing.createCheckout(request.authUser, request.body))
    } catch (error) { next(error) }
  })
  router.get('/orders/:id', async (request, response, next) => {
    try {
      response.json(await billing.getOrder(request.authUser, String(request.params.id)))
    } catch (error) { next(error) }
  })
  return router
}
