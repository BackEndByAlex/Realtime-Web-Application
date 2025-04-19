import { logger } from '../config/winston.js'
import { broadcast } from '../config/webSocketServer.js' // Import WebSocket broadcast function

// Hämta GitLab-webhook-signature från miljövariabeln
const GITLAB_WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET

/**
 * WebhooksController handles incoming webhook events related to GitLab issues.
 *
 * @class
 */
export class WebhooksController {
  /**
   * Handles POST requests for webhooks, specifically processing GitLab issue events.
   * Broadcasts real-time updates via WebSockets based on the issue event type.
   *
   * @async
   * @param {import('express').Request} req - Express request object containing webhook payload
   * @param {import('express').Response} res - Express response object
   * @returns {Promise<void>}
   * @throws {Error} When there's an error processing the webhook
   */
  async indexPost (req, res) {
    const signature = req.headers['x-gitlab-token']

    // Kontrollera om token matchar det förväntade värdet
    if (!signature || signature !== GITLAB_WEBHOOK_SECRET) {
      logger.warn('Ogiltig webhook-signatur!')
      return res.status(403).json({ error: 'Forbidden: Invalid webhook signature' })
    }
    try {
      const message = req.body
      logger.info('Webhook received', { message })

      if (message.event_type !== 'issue') return

      const issueData = {
        id: message.object_attributes.iid,
        title: message.object_attributes.title,
        state: message.object_attributes.state,
        description: message.object_attributes.description
      }

      let eventType = 'issueUpdated' // Default event

      if (message.object_attributes.state === 'closed') {
        eventType = 'issueClosed'
      } if (message.object_attributes.action === 'open' || message.object_attributes.action === 'create') {
        eventType = 'issueCreated'
      }

      // Skicka realtidsuppdatering via WebSockets med korrekt event-typ
      broadcast(eventType, issueData)

      logger.info(`Issue ${issueData.id} event: ${eventType}`)

      res.status(200).send('Webhook received') // Acknowledge webhook
    } catch (error) {
      logger.error('Error processing webhook:', error)
    }
  }
}
