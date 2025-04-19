/**
 * @file Defines the Morgan logger.
 * @module config/morgan
 * @author Mats Loock
 * @version 1.0.0
 */

import morgan from 'morgan'
import { logger } from './winston.js'

/**
 * Get the color code based on the HTTP status code.
 *
 * @param {number} status - The HTTP status code.
 * @returns {number} The color code corresponding to the status code.
 */
const getStatusColor = (status) => {
  if (status >= 500) {
    return 41 // red
  } else if (status >= 400) {
    return 43 // yellow
  } else if (status >= 300) {
    return 46 // cyan
  } else if (status >= 200) {
    return 42 // green
  } else {
    return 0 // no color
  }
}

/**
 * Format the status code with the corresponding color.
 *
 * @param {number} status - The HTTP status code.
 * @returns {string} The formatted status code with color.
 */
const colorizeStatus = (status) => {
  // Get status color.
  const color = getStatusColor(status)

  // fg:30, black bg:status color fg:39, reset bg:49, reset
  return `\x1b[30m\x1b[${color}m${status}\x1b[39m\x1b[49m`
}

/**
 * Custom Morgan token 'statusColor' that returns the formatted status code with color.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {object} args - Additional arguments.
 * @returns {string} The formatted status code with color.
 */
morgan.token('statusColor', (req, res, args) => {
  // Get the status code if response written.
  const status = res.headersSent || Boolean(res.header) ? res.statusCode : undefined

  return colorizeStatus(status)
})

export const morganLogger = morgan(
  process.env.LOGGER_MORGAN_FORMAT_ADD_REMOTE?.toLocaleLowerCase() === 'true'
    ? ':remote-addr :remote-user :method :url HTTP/:http-version :statusColor :res[content-length] - :response-time ms'
    : ':method :url :statusColor :res[content-length] - :response-time ms',
  {
    stream: {
      /**
       * Writes the message to the logger.
       *
       * @param {string} message - The message to write.
       */
      write: (message) => {
        logger.http(message.trim())
      }
    }
  }
)
