/**
 * @file Defines the Winston logger.
 * @module config/winston
 * @author Mats Loock
 * @version 1.0.0
 */

import httpContext from 'express-http-context'
import '@lnu/json-js-cycle'
import { addColors, createLogger, format, transports } from 'winston'

// Destructuring assignment for convenience.
const { colorize, combine, json, printf, timestamp } = format

// The colorizer.
const colorizer = colorize()

// Adds colors to the colorizer.
addColors({
  info: 'blue',
  warn: 'italic yellow',
  error: 'bold red',
  http: 'white',
  debug: 'magenta',
  silly: 'cyan',
  verbose: 'gray'
})

// Finds ANSI color sequences.
// eslint-disable-next-line no-control-regex
const decolorizeRegex = /\x1b\[[0-9]{1,3}m/gi

const defaultMetadata = {
  /**
   * Gets the current request.
   *
   * @returns {object} The current request.
   */
  get request () {
    const req = httpContext.get('request')
    return {
      startTime: req?._startTime,
      requestUuid: req?.requestUuid,
      method: req?.method,
      url: req?.originalUrl,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      referer: req ? req.get('Referer') || '-' : undefined
    }
  },

  /**
   * Gets the current request's session ID.
   *
   * @returns {object} The current request's session ID.
   */
  get sessionId () {
    const req = httpContext.get('request')
    return req?.sessionID
  },

  /**
   * Gets the current user.
   *
   * @returns {object} The current request's user.
   */
  get user () {
    const req = httpContext.get('request')
    return req?.session?.user
  }
}

/**
 * Returns true if the value is empty, otherwise false.
 *
 * @param {object} value - The value to check.
 * @returns {boolean} True if the value is empty, otherwise false.
 */
const isEmptyData = (value) => {
  if (value == null) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.every(isEmptyData)
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isEmptyData)
  }

  return false
}

/**
 * Formats the metadata property.
 *
 * @returns {object} The formatted metadata property.
 */
const metadataFormatter = format((info) => {
  // Serialize the metadata property.
  if (info.metadata) {
    // Deep copies the metadata object and returns a new object with
    // enumerable and non-enumerable properties (cyclical structures are handled).
    info.metadata = JSON.decycle(info.metadata, { includeNonEnumerableProperties: true })
  }

  // Only add a defaultMetadata property if there is any non-empty data.
  if (!Object.values(defaultMetadata).every(isEmptyData)) {
    info.metadata = {
      ...defaultMetadata,
      ...info.metadata
    }
  }

  // Remove the metadata property if it's empty.
  if (Object.values(info.metadata).every(isEmptyData)) {
    delete info.metadata
  }

  return info
})

/**
 * Removes ANSI color sequences from the message.
 */
const decolorize = format((info) => {
  info.message = info.message.replace(decolorizeRegex, '')
  return info
})

/**
 * The base format.
 */
const baseFormat = combine(
  format.metadata(),
  metadataFormatter(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
)

/**
 * The logger.
 */
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'http',
  transports: [
    new transports.Console({
      format: combine(
        baseFormat,
        printf(({ timestamp, level, message, metadata }) => {
          let colorLevel = level

          // If the level is http, let the status code decide the color.
          if (level === 'http') {
            const status = Number.parseInt(message.split(' ')[5])

            if (status >= 500) {
              colorLevel = 'error'
            } else if (status >= 400) {
              colorLevel = 'warn'
            } else if (status >= 300) {
              colorLevel = 'verbose'
            } else if (status >= 200) {
              colorLevel = 'http'
            }
          }

          return colorizer.colorize(colorLevel, `[${timestamp}] ${level.toLocaleUpperCase()}: ${message} ${metadata?.error?.stack ? `\n  ${metadata.error.stack}` : ''}`)
        })
      )
    })
  ]
})

// Add file transport if a path to the combined log file is provided.
if (process.env.LOGGER_COMBINED_LOG_FILE) {
  logger.add(
    new transports.File({
      filename: process.env.LOGGER_COMBINED_LOG_FILE,
      decolorize: true,
      format: combine(
        baseFormat,
        decolorize(),
        json()
      )
    })
  )
}

// Add file transport if a path to the error log file is provided.
if (process.env.LOGGER_ERROR_LOG_FILE) {
  logger.add(
    new transports.File({
      filename: process.env.LOGGER_ERROR_LOG_FILE,
      level: 'error',
      decolorize: true,
      format: combine(
        baseFormat,
        decolorize(),
        json()
      )
    })
  )
}

// Add file transport if a path to the uncaught exception log file is provided.
if (process.env.LOGGER_UNCAUGHT_EXCEPTION_LOG_FILE) {
  logger.exceptions.handle(
    new transports.File({
      filename: process.env.LOGGER_UNCAUGHT_EXCEPTION_LOG_FILE
    })
  )
}

// Add MongoDB transport if a connection string is provided.
if (process.env.LOGGER_DB_CONNECTION_STRING) {
  await import('winston-mongodb')

  logger.add(new transports.MongoDB({
    level: 'warn',
    db: process.env.LOGGER_DB_CONNECTION_STRING,
    options: {
      poolSize: 2,
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    collection: process.env.LOGGER_DB_COLLECTION_NAME || 'logs',
    capped: true,
    decolorize: true,
    format: combine(
      baseFormat
    )
  }))
}
