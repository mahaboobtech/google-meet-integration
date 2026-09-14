document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let currentUser = null;
  let guestList = [];

  // DOM Elements
  const userAuthBar = document.getElementById('userAuthBar');
  const createMeetForm = document.getElementById('createMeetForm');
  const meetingTitleInput = document.getElementById('meetingTitle');
  const accessTypeInput = document.getElementById('accessType');
  const entryPointAccessInput = document.getElementById('entryPointAccess');
  const guestEmailInput = document.getElementById('guestEmailInput');
  const guestRoleInput = document.getElementById('guestRoleInput');
  const btnAddGuest = document.getElementById('btnAddGuest');
  const guestChipsContainer = document.getElementById('guestChipsContainer');
  const btnCreateMeet = document.getElementById('btnCreateMeet');

  // Result Elements
  const resultCard = document.getElementById('resultCard');
  const resultPlaceholder = document.getElementById('resultPlaceholder');
  const resultContent = document.getElementById('resultContent');
  const resultTitle = document.getElementById('resultTitle');
  const resultMeetUrl = document.getElementById('resultMeetUrl');
  const btnCopyMeetUrl = document.getElementById('btnCopyMeetUrl');
  const resultSpaceCode = document.getElementById('resultSpaceCode');
  const resultAccessType = document.getElementById('resultAccessType');
  const resultGuestCount = document.getElementById('resultGuestCount');
  const resultGuestsList = document.getElementById('resultGuestsList');
  const btnJoinMeet = document.getElementById('btnJoinMeet');

  // History Elements
  const historyTableBody = document.getElementById('historyTableBody');
  const btnRefreshHistory = document.getElementById('btnRefreshHistory');

  // Initialize
  initUrlParamsCheck();
  fetchAuthStatus();
  fetchMeetingHistory();

  // Event Listeners
  btnAddGuest.addEventListener('click', handleAddGuest);
  guestEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGuest();
    }
  });

  createMeetForm.addEventListener('submit', handleCreateMeeting);
  btnCopyMeetUrl.addEventListener('click', handleCopyUrl);
  btnRefreshHistory.addEventListener('click', fetchMeetingHistory);

  /**
   * Checks URL query parameters for auth callback notifications
   */
  function initUrlParamsCheck() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      showToast('Google account connected successfully!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error')) {
      showToast(decodeURIComponent(urlParams.get('error')), 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Fetches Google Auth status from backend
   */
  async function fetchAuthStatus() {
    try {
      const res = await fetch('/api/google/status');
      const data = await res.json();

      if (data.authenticated && data.user) {
        currentUser = data.user;
        renderAuthProfile(data.user);
      } else {
        currentUser = null;
        renderAuthLoginButton();
      }
    } catch (err) {
      console.error('Error fetching auth status:', err);
      renderAuthLoginButton();
    }
  }

  /**
   * Renders authenticated profile state in top navbar
   */
  function renderAuthProfile(user) {
    userAuthBar.innerHTML = `
      <div class="auth-profile">
        <img src="${user.picture || 'https://lh3.googleusercontent.com/a/default-user'}" alt="Avatar" class="auth-avatar" referrerpolicy="no-referrer">
        <div class="auth-details">
          <span class="auth-name">${escapeHtml(user.name || 'Google User')}</span>
          <span class="auth-email">${escapeHtml(user.email)}</span>
        </div>
      </div>
      <button id="btnLogout" class="btn btn-secondary" title="Disconnect Google Account">
        <i class="fa-solid fa-right-from-bracket"></i> Disconnect
      </button>
    `;

    document.getElementById('btnLogout').addEventListener('click', handleLogout);
  }

  /**
   * Renders "Connect Google Account" button when unauthenticated
   */
  function renderAuthLoginButton() {
    userAuthBar.innerHTML = `
      <a href="/api/google/auth" class="btn btn-primary">
        <i class="fa-brands fa-google"></i> Connect Google Account
      </a>
    `;
  }

  /**
   * Logout handler
   */
  async function handleLogout() {
    try {
      await fetch('/api/google/logout', { method: 'POST' });
      currentUser = null;
      renderAuthLoginButton();
      showToast('Disconnected Google account', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  /**
   * Adds guest email to chip list
   */
  function handleAddGuest() {
    const email = guestEmailInput.value.trim();
    const role = guestRoleInput.value;

    if (!email) return;

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (guestList.some(g => g.email.toLowerCase() === email.toLowerCase())) {
      showToast('Guest email already added.', 'info');
      return;
    }

    guestList.push({ email, role });
    guestEmailInput.value = '';
    renderGuestChips();
  }

  /**
   * Renders guest chips in form
   */
  function renderGuestChips() {
    if (guestList.length === 0) {
      guestChipsContainer.innerHTML = `<span class="no-guests-text"><i class="fa-solid fa-info-circle"></i> No guests added yet. Add email addresses above.</span>`;
      return;
    }

    guestChipsContainer.innerHTML = guestList.map((g, idx) => `
      <div class="chip">
        <i class="fa-regular fa-envelope"></i>
        <span>${escapeHtml(g.email)}</span>
        <span class="chip-role ${g.role === 'COHOST' ? 'cohost' : ''}">${g.role === 'COHOST' ? 'Co-Host' : 'Guest'}</span>
        <button type="button" class="chip-remove" data-idx="${idx}" title="Remove guest">&times;</button>
      </div>
    `).join('');

    // Attach remove handlers
    guestChipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        guestList.splice(idx, 1);
        renderGuestChips();
      });
    });
  }

  /**
   * Form submission handler for creating Google Meet
   */
  async function handleCreateMeeting(e) {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please connect your Google account before creating a meeting.', 'error');
      window.location.href = '/api/google/auth';
      return;
    }

    const title = meetingTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a meeting title.', 'error');
      return;
    }

    const sendCalendarInviteInput = document.getElementById('sendCalendarInvite');

    const payload = {
      title: title,
      accessType: accessTypeInput.value,
      entryPointAccess: entryPointAccessInput.value,
      guests: guestList,
      sendCalendarInvite: sendCalendarInviteInput ? sendCalendarInviteInput.checked : true
    };

    setLoadingState(true);

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 401 || (data.message && data.message.includes('authentication'))) {
        showToast('Please connect your Google Account first to authorize Google Meet creation.', 'error');
        setTimeout(() => {
          window.location.href = '/api/google/auth';
        }, 1500);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Google Meet space.');
      }

      showToast('Google Meet space created successfully!', 'success');
      displayMeetingResult(data.meeting);
      fetchMeetingHistory();

    } catch (err) {
      console.error('Create meeting error:', err);
      showToast(err.message, 'error');
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Displays the created meeting result in the right card
   */
  function displayMeetingResult(meeting) {
    resultPlaceholder.classList.add('hidden');
    resultContent.classList.remove('hidden');

    resultTitle.textContent = meeting.title;
    resultMeetUrl.value = meeting.meetUrl;
    resultSpaceCode.textContent = meeting.id;
    resultAccessType.textContent = meeting.accessType;
    btnJoinMeet.href = meeting.meetUrl;

    const guests = meeting.guests || [];
    resultGuestCount.textContent = guests.length;

    if (guests.length === 0) {
      resultGuestsList.innerHTML = `<span class="text-muted" style="font-size:0.85rem;">No guests specified.</span>`;
    } else {
      resultGuestsList.innerHTML = guests.map(g => {
        const statusObj = meeting.memberStatuses?.find(s => s.email === g.email);
        let statusBadge = '';
        if (statusObj) {
          statusBadge = statusObj.success 
            ? `<span style="color:#10b981;font-size:0.75rem;"><i class="fa-solid fa-check"></i> Added</span>`
            : `<span style="color:#f59e0b;font-size:0.75rem;" title="${escapeHtml(statusObj.reason)}"><i class="fa-solid fa-info-circle"></i> Link Invited</span>`;
        }

        return `
          <div class="guest-item">
            <span><i class="fa-regular fa-user"></i> ${escapeHtml(g.email)}</span>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span class="chip-role ${g.role === 'COHOST' ? 'cohost' : ''}">${g.role === 'COHOST' ? 'Co-Host' : 'Guest'}</span>
              ${statusBadge}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * One-click Copy URL handler
   */
  async function handleCopyUrl() {
    const url = resultMeetUrl.value;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      btnCopyMeetUrl.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
      btnCopyMeetUrl.style.background = 'rgba(16, 185, 129, 0.25)';
      btnCopyMeetUrl.style.color = '#10b981';

      showToast('Meet link copied to clipboard!', 'success');

      setTimeout(() => {
        btnCopyMeetUrl.innerHTML = `<i class="fa-regular fa-copy"></i> Copy Meet Link`;
        btnCopyMeetUrl.style.background = '';
        btnCopyMeetUrl.style.color = '';
      }, 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      resultMeetUrl.select();
      document.execCommand('copy');
      showToast('Link copied!', 'success');
    }
  }

  /**
   * Fetches session meeting history
   */
  async function fetchMeetingHistory() {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();

      if (data.meetings && data.meetings.length > 0) {
        renderHistoryTable(data.meetings);
      } else {
        historyTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center empty-table">
              <i class="fa-solid fa-calendar-xmark"></i> No meetings created in this session yet.
            </td>
          </tr>
        `;
      }
    } catch (err) {
      console.error('History fetch error:', err);
    }
  }

  /**
   * Renders history table
   */
  function renderHistoryTable(meetings) {
    historyTableBody.innerHTML = meetings.map(m => {
      const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';
      return `
        <tr>
          <td><strong>${escapeHtml(m.title)}</strong></td>
          <td><a href="${m.meetUrl}" target="_blank" rel="noopener" class="history-link">${m.meetUrl}</a></td>
          <td><span class="code-badge">${m.accessType}</span></td>
          <td style="color:var(--text-muted);">${timeStr}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="copyText('${m.meetUrl}')" title="Copy URL">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
            <a href="${m.meetUrl}" target="_blank" rel="noopener" class="btn btn-success btn-sm">
              Join <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Global helper for row copy button
  window.copyText = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied Meet link to clipboard!', 'success');
  };

  /**
   * Button loading state toggle
   */
  function setLoadingState(isLoading) {
    const btnText = btnCreateMeet.querySelector('.btn-text');
    const btnSpinner = btnCreateMeet.querySelector('.btn-spinner');

    if (isLoading) {
      btnCreateMeet.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
    } else {
      btnCreateMeet.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  /**
   * Toast notification system
   */
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Utilities
   */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
