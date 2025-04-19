/**
 * @file Defines the main application..
 * @module app
 * @author Mats Loock
 * @version 3.4.0
 */

import httpContext from 'express-http-context' // Must be first!
import express from 'express'
import expressLayouts from 'express-ejs-layouts'
import session from 'express-session'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import connectDB from './config/mongoose.js'
import { morganLogger } from './config/morgan.js'
import { sessionOptions } from './config/sessionOptions.js'
import { wss } from './config/webSocketServer.js'
import { logger } from './config/winston.js'
import helmet from 'helmet'
import router from './routes/router.js'

try {
  // Connect to MongoDB.
  await connectDB(process.env.DB_CONNECTION_STRING)

  // Creates an Express application.
  const app = express()

  // Get the directory name of this module's path.
  const directoryFullName = dirname(fileURLToPath(import.meta.url))

  // Set the base URL to use for all relative URLs in a document.
  const baseURL = process.env.BASE_URL || '/'

  // View engine setup.
  app.set('view engine', 'ejs')
  app.set('views', join(directoryFullName, 'views'))
  app.set('layout', join(directoryFullName, 'views', 'layouts', 'default'))
  app.set('layout extractScripts', true)
  app.set('layout extractStyles', true)
  app.use(expressLayouts)

  // Parse requests of the content type application/x-www-form-urlencoded.
  // Populates the request object with a body object (req.body).
  app.use(express.urlencoded({ extended: false }))

  // --------------------------------------------------------------------------
  //
  // Webhook: Parse incoming requests with JSON payloads (application/json).
  // Populates the request object with a body object (req.body).
  //
  app.use(express.json())
  // --------------------------------------------------------------------------

  // Serve static files.
  app.use(express.static(join(directoryFullName, '..', 'public')))

  // Setup and use session middleware (https://github.com/expressjs/session)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1) // trust first proxy
  }
  app.use(session(sessionOptions))

  // Add the request-scoped context.
  // NOTE! Must be placed before any middle that needs access to the context!
  //       See https://www.npmjs.com/package/express-http-context.
  app.use(httpContext.middleware)

  // Use a morgan logger.
  app.use(morganLogger)

  // Middleware to be executed before the routes.
  app.use((req, res, next) => {
    // Add a request UUID to each request and store information about
    // each request in the request-scoped context.
    req.requestUuid = randomUUID()
    httpContext.set('request', req)

    // Flash messages - survives only a round trip.
    if (req.session.flash) {
      res.locals.flash = req.session.flash
      delete req.session.flash
    }

    // Pass the base URL to the views.
    res.locals.baseURL = baseURL

    // Pass the WebSocket server to the response object.
    res.wss = wss

    next()
  })

  // Use the helmet middleware.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://secure.gravatar.com'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      }
    })
  )

  // Register routes.
  app.use('/', router)

  // Error handler.
  app.use((err, req, res, next) => {
    logger.error(err.message, { error: err })

    const errorCode = err.status || err.statusCode || 500

    if (errorCode === 401) {
      return res.status(401).render('error/401', { title: 'Unauthorized', error: err })
    }
    if (errorCode === 404) {
      return res.status(404).render('error/404', { title: 'Page Not Found', error: err })
    }
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).render('error/500', { title: 'Internal Server Error', error: err })
    }

    // ---------------------------------------------------
    // ⚠️ WARNING: Development Environment Only!
    //             Detailed error information is provided.
    // ---------------------------------------------------

    // Render the error page.
    res
      .status(err.status || 500)
      .render('errors/error', { error: err })
  })

  // Starts the HTTP server listening for connections.
  const server = app.listen(process.env.PORT, () => {
    logger.info(`Server running at http://localhost:${server.address().port}`)
    logger.info('Press Ctrl-C to terminate...')
  })

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (socket) => {
      wss.emit('connection', socket, request)
    })
  })
} catch (err) {
  logger.error(err.message, { error: err })
  process.exitCode = 1
}
