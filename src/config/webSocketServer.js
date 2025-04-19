import { WebSocketServer } from 'ws'
import { logger } from './winston.js'

export const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (ws) => {
  logger.info('Ny WebSocket-klient ansluten')

  ws.on('message', (message) => {
    logger.info(`Meddelande mottaget: ${message}`)
  })

  ws.on('close', () => {
    logger.info('WebSocket-klient kopplade från')
  })
})

/**
 * Broadcasts a message to all connected WebSocket clients.
 *
 * @param {string} event - The event name to broadcast.
 * @param {*} data - The data to be sent with the event.
 * @returns {void}
 */
export const broadcast = (event, data) => {
  const message = JSON.stringify({ event, data })

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}
