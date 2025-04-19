// Vänta tills DOM är laddad
document.addEventListener('DOMContentLoaded', function () {
  const socket = new WebSocket('wss://cscloud6-83.lnu.se/issues-app/issues')

  socket.addEventListener('message', (event) => {
    const { event: eventType, data } = JSON.parse(event.data)

    if (eventType === 'issueCreated') {
      addIssueToList(data)
    } else if (eventType === 'issueClosed' || eventType === 'issueReopened' || eventType === 'issueUpdated') {
      updateIssueStatus(data.id, data.state)
    }
  })
})

/**
 * Adds an issue to the issues list in the DOM.
 *
 * @param {object} issue - The issue object to add to the list.
 * @param {number} issue.id - The unique identifier of the issue.
 * @param {string} issue.title - The title of the issue.
 * @param {string} issue.state - The current state of the issue.
 */
function addIssueToList (issue) {
  const issuesList = document.getElementById('issues-list')

  if (!issuesList) {
    console.warn('Issues-listan hittades inte!')
    return
  }

  // Skapa nytt list-element (li)
  const newIssueElement = document.createElement('li')
  newIssueElement.setAttribute('data-id', issue.id)

  // Skapa länk till issues-detaljsidan
  const issueLink = document.createElement('a')
  issueLink.setAttribute('href', `./issues/showIssue/${issue.id}`)
  issueLink.classList.add('issue-link')

  const issueTitle = document.createElement('strong')
  issueTitle.textContent = `#${issue.id}: ${issue.title}`

  issueLink.appendChild(issueTitle)

  // Skapa status-element
  const issueStatus = document.createElement('span')
  issueStatus.classList.add('issue-status')
  issueStatus.setAttribute('data-id', issue.id)
  issueStatus.textContent = issue.state

  // Lägg till i listan
  newIssueElement.appendChild(issueLink)
  newIssueElement.appendChild(issueStatus)
  issuesList.prepend(newIssueElement)
}

/**
 * Updates the status of an issue in the DOM.
 *
 * @param {string|number} issueId - The unique identifier of the issue to update
 * @param {('opened'|'closed')} newState - The new state to set for the issue
 * @throws {Error} If the issue element cannot be found in the DOM
 */
function updateIssueStatus (issueId, newState) {
  const issueElement = document.querySelector(`.issue-status[data-id="${issueId}"]`)

  if (issueElement) {
    issueElement.textContent = newState
    issueElement.classList.toggle('closed', newState === 'closed')
    issueElement.classList.toggle('open', newState === 'opened')
  }
}
