const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5051/api')

function titleCase(s) {
  try {
    const str = String(s || '')
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  } catch {
    return ''
  }
}

function humanizePath(pathArr) {
  if (!Array.isArray(pathArr) || !pathArr.length) return ''
  // Special-case contacts[index].field -> Contact N: field
  if (pathArr[0] === 'contacts' && typeof pathArr[1] === 'number') {
    const idx = Number(pathArr[1]) + 1
    const tail = pathArr.slice(2).join(' ')
    return `Contact ${idx}${tail ? ` ${tail}` : ''}`
  }
  return pathArr.join(' ')
}

function formatApiError(body) {
  try {
    if (body && Array.isArray(body.details) && body.details.length) {
      const messages = body.details.map((d) => {
        const fieldPath = humanizePath(d.path)
        const field = String((d.path && d.path[d.path.length - 1]) || d?.context?.label || '').replace(/"/g, '')
        if ((d.type || '').includes('string.email')) {
          return `${fieldPath ? `${fieldPath}: ` : ''}${titleCase(field || 'Email')} is not a valid email`
        }
        if ((d.type || '').includes('any.required')) {
          return `${fieldPath ? `${fieldPath}: ` : ''}${titleCase(field || 'Field')} is required`
        }
        const cleaned = String(d.message || '').replace(/"/g, '')
        // If Joi message starts with the raw path, replace with humanized label
        if (fieldPath && cleaned.startsWith((d.context?.label || field) || '')) {
          const parts = cleaned.split(/\s+/).slice(1).join(' ')
          return `${fieldPath}: ${parts || 'invalid'}`
        }
        return fieldPath ? `${fieldPath}: ${cleaned}` : cleaned
      })
      return `Please fix the following:\n- ${messages.join('\n- ')}`
    }
    if (body && body.message) return body.message
  } catch {}
  return ''
}

async function apiRequest(path, options = {}) {
  let authHeaders = {}
  try {
    const token = localStorage.getItem('token')
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`
    }
  } catch {}
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    // Safely read body twice (json or text) using clone
    const clone = res.clone()
    let parsed
    try {
      parsed = await clone.json()
    } catch (_e) {
      parsed = null
    }
    if (parsed) {
      const friendly = formatApiError(parsed)
      throw new Error(friendly || parsed.message || `Request failed: ${res.status}`)
    }
    const text = await clone.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.text()
}

export const api = {
  listHomes: () => apiRequest('/homes'),
  listMyHomes: () => apiRequest('/my/homes'),
  createHome: (body) => apiRequest('/homes', { method: 'POST', body: JSON.stringify(body) }),
  getHome: (id) => apiRequest(`/homes/${id}`),
  addBid: (homeId, body) => apiRequest(`/homes/${homeId}/trades`, { method: 'POST', body: JSON.stringify(body) }),
  addTask: (homeId, bidId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (homeId, bidId, taskId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addHomeQualityCheck: (homeId, bidId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}/quality-checks`, { method: 'POST', body: JSON.stringify(body) }),
  addSchedule: (homeId, body) => apiRequest(`/homes/${homeId}/schedules`, { method: 'POST', body: JSON.stringify(body) }),
  addDocument: (homeId, body) => apiRequest(`/homes/${homeId}/documents`, { method: 'POST', body: JSON.stringify(body) }),
  deleteDocument: (homeId, docId) => apiRequest(`/homes/${homeId}/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' }),
  // Presign no longer supported after switching to server-style aws-sdk v2 upload
  presignUpload: () => Promise.reject(new Error('Presigned uploads are no longer supported')),
  uploadTaskFile: async (homeId, taskId, file, title) => {
    const form = new FormData()
    if (title) form.append('title', title)
    form.append('file', file)
    form.append('folderName', `homes/${homeId}/tasks/${taskId}`)
    const res = await fetch(`${API_BASE}/file-storage/upload`, {
      method: 'POST',
      headers: {
        // don't set content-type for multipart; browser sets boundary
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: form
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Upload failed: ${res.status}`)
    }
    return res.json()
  },
  updateQualityCheck: async (homeId, bidId, checkId, payload) => {
    const res = await fetch(`${API_BASE}/homes/${homeId}/trades/${bidId}/quality-checks/${checkId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Update failed: ${res.status}`)
    }
    return res.json()
  },
  uploadTradeFile: async (homeId, tradeId, file, title) => {
    const form = new FormData()
    if (title) form.append('title', title)
    form.append('file', file)
    form.append('folderName', `homes/${homeId}/trades/${tradeId}`)
    const res = await fetch(`${API_BASE}/file-storage/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: form
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Upload failed: ${res.status}`)
    }
    return res.json()
  },
  uploadHomeFile: async (homeId, file, title) => {
    const form = new FormData()
    if (title) form.append('title', title)
    form.append('file', file)
    form.append('folderName', `homes/${homeId}/documents`)
    const res = await fetch(`${API_BASE}/file-storage/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: form
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Upload failed: ${res.status}`)
    }
    return res.json()
  },
  listPeople: (role) => apiRequest(`/people${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  upsertPerson: (body) => apiRequest('/people', { method: 'POST', body: JSON.stringify(body) }),
  onboardingCreate: (body) => apiRequest('/onboarding', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/auth/me'),
  // Templates API (DB-backed)
  listTemplates: () => apiRequest('/templates'),
  getTemplate: (id) => apiRequest(`/templates/${id}`),
  createTemplate: (body) => apiRequest('/templates', { method: 'POST', body: JSON.stringify(body) }),
  createTemplateVersion: (id) => apiRequest(`/templates/${id}/version`, { method: 'POST' }),
  updateTemplate: (id, body) => apiRequest(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  freezeTemplate: (id) => apiRequest(`/templates/${id}/freeze`, { method: 'POST' }),
  addTemplateTrade: (id, body) => apiRequest(`/templates/${id}/trades`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTemplateTrade: (id, tradeId) => apiRequest(`/templates/${id}/trades/${tradeId}`, { method: 'DELETE' }),
  addTemplateTask: (id, tradeId, body) => apiRequest(`/templates/${id}/trades/${tradeId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTemplateTask: (id, tradeId, taskId) => apiRequest(`/templates/${id}/trades/${tradeId}/tasks/${taskId}`, { method: 'DELETE' }),
  addTemplateQualityCheck: (id, tradeId, body) => apiRequest(`/templates/${id}/trades/${tradeId}/quality-checks`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTemplateQualityCheck: (id, tradeId, checkId) => apiRequest(`/templates/${id}/trades/${tradeId}/quality-checks/${checkId}`, { method: 'DELETE' }),
  updateBid: (homeId, bidId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}`, { method: 'PUT', body: JSON.stringify(body) }),
  addBidInvoice: (homeId, bidId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}/invoices`, { method: 'POST', body: JSON.stringify(body) }),
  updateBidInvoice: (homeId, bidId, invoiceId, body) => apiRequest(`/homes/${homeId}/trades/${bidId}/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  // Home messages
  listMessages: (homeId, { tradeId, taskId, limit, before } = {}) => {
    const params = new URLSearchParams()
    if (tradeId) params.set('tradeId', tradeId)
    if (taskId) params.set('taskId', taskId)
    if (limit) params.set('limit', String(limit))
    if (before) params.set('before', before)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return apiRequest(`/homes/${homeId}/messages${qs}`)
  },
  createMessage: (homeId, body) => apiRequest(`/homes/${homeId}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  createTaskFromMessage: (homeId, body) => apiRequest(`/homes/${homeId}/messages/task-from-message`, { method: 'POST', body: JSON.stringify(body) }),
  // Account + subscription
  getMyAccount: () => apiRequest('/my/account'),
  initMyAccount: () => apiRequest('/my/account/init', { method: 'POST' }),
  inviteAccountMember: ({ email, fullName, role }) => apiRequest('/my/account/members', { method: 'POST', body: JSON.stringify({ email, fullName, role }) }),
  updateAccountMemberRole: ({ email, role }) => apiRequest('/my/account/members', { method: 'PATCH', body: JSON.stringify({ email, role }) }),
  removeAccountMember: (email) => apiRequest(`/my/account/members/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  getSubscription: () => apiRequest('/my/account/subscription'),
  updateSubscription: (action) => apiRequest('/my/account/subscription', { method: 'PATCH', body: JSON.stringify({ action }) }),
  // Per-home subscriptions
  listAccountSubscriptions: () => apiRequest('/my/account/subscriptions'),
  createAccountSubscription: ({ homeId, planId }) =>
    apiRequest('/my/account/subscriptions', { method: 'POST', body: JSON.stringify({ homeId, planId }) }),
  updateAccountHomeSubscription: ({ homeId, action, planId }) =>
    apiRequest(`/my/account/subscriptions/${encodeURIComponent(homeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(planId ? { action, planId } : { action })
    }),
  // AI analyze: upload files (by URL) and let OpenAI read them directly (supports PDFs with diagrams)
  analyzeDocuments: ({ urls, prompt }) =>
    apiRequest('/ai/analyze-files', { method: 'POST', body: JSON.stringify({ urls, prompt }) }),
  analyzeTrade: ({ homeId, tradeId, taskId, urls, prompt, containsImages }) =>
    apiRequest('/ai/analyze-trade', {
      method: 'POST',
      body: JSON.stringify({ homeId, tradeId, taskId, urls, prompt, containsImages })
    }),
  // Bid comparison for a trade
  compareTradeBids: (homeId, bidId, { urls, extraContext }) =>
    apiRequest(`/homes/${homeId}/trades/${bidId}/compare-bids`, {
      method: 'POST',
      body: JSON.stringify({ urls, extraContext })
    }),
}


