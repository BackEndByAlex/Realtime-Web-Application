import express from 'express'
import { getIssueById, getAllIssues, updateChecklist, closeIssue, reopenIssue } from '../controllers/issuesController.js' // Importera kontrollern
import { WebhooksController } from '../controllers/WebhookController.js'

const router = express.Router()
const controller = new WebhooksController()

router.get('/', (req, res) => {
  res.render('home/index', { title: 'Home' })
})

// Uppdaterad issues-route
router.get('/issues', getAllIssues)

router.get('/issues/showIssue/:iid', getIssueById)

router.post('/issues/showIssue/:iid/checklist', updateChecklist)

router.post('/issues/:iid/close', closeIssue)

router.post('/issues/:iid/reopen', reopenIssue)

router.post('/webhook', (req, res, next) => controller.indexPost(req, res, next))

router.use((req, res, next) => {
  const error = new Error('Page Not Found')
  error.status = 404
  next(error) // Skicka felet till din error-handler i `server.js`
})

export default router
