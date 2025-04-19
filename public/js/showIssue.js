/**
 * A module for managing issue status updates in real-time using WebSocket.
 * This module handles the following functionalities:
 * - Initializes WebSocket connection for real-time issue updates
 * - Manages DOM event listeners for issue status changes
 * - Handles closing and reopening of issues
 * - Updates the UI in response to issue status changes
 *
 * The module sets up event listeners once the DOM is loaded and maintains
 * a WebSocket connection to receive real-time updates about issue status changes.
 * It provides functionality to:
 * - Close issues through API calls
 * - Reopen closed issues
 * - Update the UI to reflect current issue status
 * - Handle WebSocket messages for real-time updates
 *
 * @module showIssue
 * @requires WebSocket
 */

// Vänta tills DOM är laddad
document.addEventListener('DOMContentLoaded', function () {
  const closeBtns = document.querySelectorAll('.close-btn')
  const reopenBtns = document.querySelectorAll('.reopen-btn')

  // Lägg till event listener för varje 'close' knapp
  closeBtns.forEach(button => {
    button.addEventListener('click', function (event) {
      const issueId = this.getAttribute('data-issue-id')
      closeIssue(issueId, event)
    })
  })

  // Lägg till event listener för varje 'reopen' knapp
  reopenBtns.forEach(button => {
    button.addEventListener('click', function (event) {
      const issueId = this.getAttribute('data-issue-id')
      reopenIssue(issueId, event)
    })
  })
})

const issueId = window.location.pathname.split('/').pop()
const socket = new WebSocket(`wss://cscloud6-83.lnu.se/issues-app/showIssue/${issueId}`)

socket.addEventListener('message', (event) => {
  const { event: eventType, data } = JSON.parse(event.data)

  if (data.state === 1) data.state = 'opened'
  if (data.state === 0) data.state = 'closed'

  if (eventType === 'issueClosed' || eventType === 'issueReopened' || eventType === 'issueUpdated') {
    updateIssueStatus(data.state)
  }
})

/**
 * Updates the status of an issue in the UI, modifying both the status display and the action button.
 *
 * @param {string} status - The new status to set ('close', 'open', 'closed', or 'opened')
 * @throws {Error} Will throw an error if required DOM elements are not found
 * @requires issueId - Global variable containing the current issue ID
 * @requires closeIssue - Function to handle closing an issue
 * @requires reopenIssue - Function to handle reopening an issue
 */
function updateIssueStatus (status) {
  // Se till att status är exakt 'closed' eller 'opened'
  if (status === 'close') status = 'closed'
  if (status === 'open') status = 'opened'

  const statusElement = document.querySelector('.issue-status')
  if (statusElement) {
    statusElement.textContent = status
    statusElement.setAttribute('data-state', status)
    statusElement.classList.toggle('closed', status === 'closed')
    statusElement.classList.toggle('open', status === 'opened')
  }

  // Hantera knappuppdatering utan innerHTML
  const buttonContainer = document.getElementById('button-container')

  if (buttonContainer) {
    const oldButton = buttonContainer.querySelector('button')
    if (oldButton) oldButton.remove() // Ta bort den gamla knappen

    const newButton = document.createElement('button')
    newButton.classList.add('button')
    newButton.setAttribute('data-issue-id', issueId)

    if (status === 'closed') {
      newButton.textContent = 'Reopen Issue'
      newButton.classList.add('reopen-btn')
      newButton.addEventListener('click', (event) => reopenIssue(issueId, event))
    } else {
      newButton.textContent = 'Close Issue'
      newButton.classList.add('close-btn')
      newButton.addEventListener('click', (event) => closeIssue(issueId, event))
    }

    buttonContainer.appendChild(newButton) // Lägg till den nya knappen
  }
}

/**
 * Closes an issue by making a POST request to the server.
 *
 * @param {string|number} issueId - The ID of the issue to close.
 * @param {Event} event - The event object from the form submission.
 * @throws {Error} If the server request fails.
 */
function closeIssue (issueId, event) {
  event.preventDefault() // Förhindra form submission

  fetch(`./issues/${issueId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.json())
    .then(data => {
      updateIssueStatus(data.state) // Se till att rätt status skickas
    })
    .catch(error => {
      console.error('Error closing issue:', error)
    })
}

// Funktion för att öppna en issue via AJAX
/**
 * Reopens a closed issue by making a POST request to the server.
 *
 * @param {string|number} issueId - The ID of the issue to reopen
 * @param {Event} event - The event object from the form submission
 * @throws {Error} If the server request fails
 */
function reopenIssue (issueId, event) {
  event.preventDefault() // Förhindra form submission

  fetch(`./issues/${issueId}/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.json())
    .then(data => {
      updateIssueStatus(data.state) // Se till att rätt status skickas
    })
    .catch(error => {
      console.error('Error reopening issue:', error)
    })
}
