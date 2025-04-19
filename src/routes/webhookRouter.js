import express from 'express'
import { WebhooksController } from '../controllers/WebhooksController.js'

export const router = express.Router()
const controller = new WebhooksController()

// Route for GitLab webhook
router.post('/', (req, res, next) => controller.indexPost(req, res, next))
