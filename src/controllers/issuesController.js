import axios from 'axios'
import { broadcast } from '../config/webSocketServer.js'

const GITLAB_API_URL = process.env.GITLAB_API_URL
const GITLAB_TOKEN = process.env.GITLAB_TOKEN

/**
 * Hämtar alla issues från GitLab API och renderar sidan med dem.
 *
 * @async
 * @function getAllIssues
 * @param {import('express').Request} req - Express request-objektet.
 * @param {import('express').Response} res - Express response-objektet.
 * @returns {Promise<void>} - Renderar sidan eller skickar ett felmeddelande vid misslyckande.
 */
export const getAllIssues = async (req, res) => {
  try {
    const response = await axios.get(GITLAB_API_URL, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    res.render('issues/issues', { issues: response.data }) // Skicka issues till vyn
  } catch (err) {
    console.error('Error fetching issues:', err)
    res.status(500).send('Error fetching issues: ' + err.message)
  }
}

/**
 * Retrieves a specific GitLab issue by its ID and renders it.
 *
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.iid - Issue ID to retrieve
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Renders the issue page or error page
 * @throws {Error} When there's an error fetching the issue from GitLab API
 */
export const getIssueById = async (req, res, next) => {
  try {
    const issueId = req.params.iid

    const response = await axios.get(`${GITLAB_API_URL}/${issueId}`, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    if (!response.data) {
      return res.status(404).render('error/404', { title: 'Issue Not Found' })
    }

    res.render('issues/showIssue', { issue: response.data, avatarUrl: response.data.author.avatar_url })
  } catch (err) {
    console.error('Error fetching issue:', err)
    next(err) // Skickar felet vidare till Express felhantering
  }
}

/**
 * Updates a checklist item in a GitLab issue description and broadcasts the change.
 *
 * @async
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.iid - GitLab issue ID
 * @param {object} req.body - Request body
 * @param {string} req.body.text - Text content of the checklist item
 * @param {boolean} req.body.checked - Whether the checklist item is checked
 * @param {object} res - Express response object
 * @returns {Promise<void>} - Sends 200 status on success, 500 on error
 * @throws {Error} - Throws error if updating checklist fails
 */
export const updateChecklist = async (req, res) => {
  try {
    const issueId = req.params.iid
    const { text, checked } = req.body

    // Hämta aktuell issue från GitLab
    const response = await axios.get(`${GITLAB_API_URL}/${issueId}`, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    let updateDescription = response.data.description || ''

    // Omvandla checklistan till en array av rader
    let descriptionLines = updateDescription.split('\n')

    // Hitta och uppdatera rätt punkt i checklistan
    descriptionLines = descriptionLines.map(line => {
      if (line.includes(text)) {
        return `- [${checked ? 'x' : ' '}] ${text}` // Uppdatera status
      }
      return line
    })

    // Skapa en ny beskrivning med den uppdaterade checklistan
    updateDescription = descriptionLines.join('\n')

    // Skicka tillbaka den uppdaterade beskrivningen till GitLab
    await axios.put(`${GITLAB_API_URL}/${issueId}`, {
      description: updateDescription
    }, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    broadcast('issueUpdated', { issueId, text, checked })

    res.status(200).send('Checklist updated')
  } catch (err) {
    console.error('Error updating checklist:', err)
    res.status(500).send('Error updating checklist: ' + err.message)
  }
}

/**
 * Closes a GitLab issue by its ID through GitLab API.
 *
 * @async
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.iid - Issue ID to close
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {Error} When GitLab API request fails
 * @returns {Promise<void>} JSON response with close status
 */
export const closeIssue = async (req, res, next) => {
  try {
    const issueId = req.params.iid

    // Anropa GitLab API för att stänga en issue
    await axios.put(`${GITLAB_API_URL}/${issueId}`, {
      state_event: 'close'
    }, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    broadcast('issueClosed', { issueId, state: 'closed' })

    // Skicka tillbaka en JSON-respons
    res.json({ message: 'Issue closed successfully', issueId, state: 'closed' })
  } catch (err) {
    console.error('Error closing issue:', err)
    res.status(500).json({ error: 'Error closing issue', details: err.message })
  }
}

/**
 * Reopens a closed GitLab issue via GitLab API.
 *
 * @async
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.iid - GitLab issue ID
 * @param {object} res - Express response object
 * @returns {Promise<void>} JSON response with message and issue details on success, error status on failure
 * @throws {Error} When the GitLab API request fails
 */
export const reopenIssue = async (req, res) => {
  try {
    const issueId = req.params.iid

    // Skicka en PUT-request till GitLab API för att ändra status
    await axios.put(`${GITLAB_API_URL}/${issueId}`, {
      state_event: 'reopen' // Öppna issue igen
    }, {
      headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN }
    })

    broadcast('issueReopened', { issueId, state: 'opened' })

    res.json({ message: 'Issue reopen successfully', issueId, state: 'opened' })
  } catch (err) {
    console.error('Error reopening issue:', err)
    res.status(500).send('Error reopening issue: ' + err.message)
  }
}
