document.addEventListener('DOMContentLoaded', () => {
  const issuesBtn = document.querySelector('#issues-btn')

  if (issuesBtn) {
    issuesBtn.addEventListener('click', () => {
      window.location.href = './issues'
    })
  }
})
