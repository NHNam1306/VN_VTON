import { Router } from 'express'
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

export const createBillingRouter = (billing: BillingService) => {
  const router = Router()
  router.get('/providers', (_request, response) => { response.json({ providers: billing.providers() }) })
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
