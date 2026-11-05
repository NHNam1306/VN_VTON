import type { PostgresPool } from '../storage/postgres.js'
import { isSubscriptionPlanId } from './catalog.js'
import type { PlanRepository } from './plan-repository.js'
import type { SubscriptionPlanId } from './types.js'

export class PostgresPlanRepository implements PlanRepository {
  constructor(private readonly pool: PostgresPool) {}
  async getPlan(userId: string): Promise<SubscriptionPlanId | null> {
    await this.pool.query(
      "UPDATE profiles SET subscription_plan='free',credit_balance=0,subscription_expires_at=NULL WHERE id=$1 AND subscription_expires_at IS NOT NULL AND subscription_expires_at<=now()",
      [userId],
    )
    const result = await this.pool.query<{ subscription_plan: string }>('SELECT subscription_plan FROM profiles WHERE id = $1', [userId])
    const value = result.rows[0]?.subscription_plan
    return isSubscriptionPlanId(value) ? value : null
  }
  async close(): Promise<void> {}
}
