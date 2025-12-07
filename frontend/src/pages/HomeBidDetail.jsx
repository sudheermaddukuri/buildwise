import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import SendIcon from '@mui/icons-material/Send'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import Tooltip from '@mui/material/Tooltip'
import BidCompareDialog from '../components/BidCompareDialog.jsx'
import DeleteIcon from '@mui/icons-material/Delete'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'

export default function HomeBidDetail() {
  const { id, bidId } = useParams()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(null)
  const [docForm, setDocForm] = useState({ title: '', url: '' })
  const [contactEditMode, setContactEditMode] = useState(false)
  const [contacts, setContacts] = useState([])
  const [contactDialog, setContactDialog] = useState({ open: false, idx: -1, company: '', fullName: '', email: '', phone: '', isPrimary: false })
  const [invoiceForm, setInvoiceForm] = useState({ label: '', amount: '', dueDate: '' })
  const [priceEditMode, setPriceEditMode] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docUploadTitle, setDocUploadTitle] = useState('')
  const [docUploadFile, setDocUploadFile] = useState(null)
  const [msgList, setMsgList] = useState([])
  const [msgText, setMsgText] = useState('')
  const [msgFiles, setMsgFiles] = useState([])
  const [preview, setPreview] = useState({ open: false, url: '', title: '' })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('Summarize the key risks, assumptions, scope gaps, and any missing information across these trade documents. Highlight potential cost or schedule impacts and suggest follow-ups.')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiSelectedUrls, setAiSelectedUrls] = useState([])
  const [aiIncludeImages, setAiIncludeImages] = useState(false)
  // Task modal state (same format as Progress by phase pages)
  const [taskModal, setTaskModal] = useState({ open: false, bidId: '', task: null })
  const [taskEdit, setTaskEdit] = useState({ title: '', description: '' })
  const [schedForm, setSchedForm] = useState({ title: '', startsAt: '', endsAt: '' })
  const [taskMessages, setTaskMessages] = useState([])
  const [taskMsgText, setTaskMsgText] = useState('')
  const [taskMsgFiles, setTaskMsgFiles] = useState([])
  const [taskUploadOpen, setTaskUploadOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const taskDocs = useMemo(() => {
    const docs = home?.documents || []
    const taskId = taskModal?.task?._id
    if (!taskId) return []
    return docs.filter((d) => d?.pinnedTo?.type === 'task' && d?.pinnedTo?.id === taskId)
  }, [home, taskModal?.task?._id])

  useEffect(() => {
    api.getHome(id).then((h) => {
      setHome(h)
      const b = (h?.trades || []).find((x) => x._id === bidId)
      if (b) {
        setEdit({ vendor: { ...(b.vendor || {}) }, totalPrice: b.totalPrice || 0, totalPaid: b.totalPaid || 0, notes: b.notes || '' })
        const v = b.vendor || {}
        const hasVendor = Boolean(v.name || v.contactName || v.email || v.phone)
        setContactEditMode(false)
        // initialize contacts from trade or derive from vendor if none
        if (Array.isArray(b.contacts) && b.contacts.length) {
          setContacts(b.contacts)
        } else if (hasVendor) {
          setContacts([{
            _id: '',
            company: v.name || '',
            fullName: v.contactName || '',
            email: v.email || '',
            phone: v.phone || '',
            isPrimary: true
          }])
        } else {
          setContacts([])
        }
      }
    }).catch((e) => setError(e.message))
  }, [id, bidId])

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listMessages(id, { tradeId: bidId, limit: 50 })
        setMsgList(list || [])
      } catch {}
    })()
  }, [id, bidId])

  const bid = useMemo(() => (home?.trades || []).find((b) => b._id === bidId), [home, bidId])
  const bidDocs = useMemo(() => {
    const tradePinned = (home?.documents || []).filter((d) => d.pinnedTo?.type === 'trade' && d.pinnedTo?.id === bidId)
    const tradeAttachments = (home?.trades || []).find((t) => t._id === bidId)?.attachments || []
    return [...tradeAttachments, ...tradePinned]
  }, [home, bidId])
  const bidPdfDocs = useMemo(() => (bidDocs || []).filter((d) => /\.pdf($|[\?#])/i.test(d?.url || '')), [bidDocs])
  const bidImageDocs = useMemo(() => (bidDocs || []).filter((d) => /\.(png|jpg|jpeg|webp|gif)$/i.test(d?.url || '')), [bidDocs])
  const aiCandidateDocs = useMemo(() => aiIncludeImages ? [...bidPdfDocs, ...bidImageDocs] : bidPdfDocs, [aiIncludeImages, bidPdfDocs, bidImageDocs])
  const invoices = useMemo(() => (bid?.invoices || []), [bid])
  const paidSum = useMemo(() => invoices.filter(i => i.paid).reduce((s, i) => s + (Number(i.amount) || 0), 0), [invoices])
  const outstanding = useMemo(() => Math.max((Number(bid?.totalPrice ?? 0)) - paidSum, 0), [bid, paidSum])
  const fmtCurrency = (n) => {
    const v = Number(n || 0)
    return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  }
  const bidSchedules = useMemo(() => (home?.schedules || []).filter((s) => s.bidId === bidId), [home, bidId])
  const qualityChecks = useMemo(() => (bid?.qualityChecks || []), [bid])
  const upcomingSchedules = useMemo(() => {
    const now = Date.now()
    return (home?.schedules || []).filter((s) => s.bidId === bidId && s.startsAt && new Date(s.startsAt).getTime() > now)
  }, [home, bidId])
  const [workTab, setWorkTab] = useState(0) // 0=Tasks,1=Quality
  const [docTab, setDocTab] = useState(0) // 0=All,1=Contracts,2=Bids,3=Invoices,4=Pictures
  const [finTab, setFinTab] = useState(0) // 0=Pricing,1=Invoices
  const [infoTab, setInfoTab] = useState(0) // 0=Schedules,1=Contracts,2=Messages
  const [addDialog, setAddDialog] = useState({ open: false, mode: 'task', bidId, title: '', desc: '', phaseKey: 'preconstruction' })

  // Reset AI selections when dialog opens or candidate list changes
  useEffect(() => {
    if (aiOpen) {
      const all = (aiCandidateDocs || []).map((d) => d.url).filter(Boolean)
      setAiSelectedUrls(all)
    }
  }, [aiOpen, aiCandidateDocs])
  async function save() {
    setError('')
    try {
      const updated = await api.updateBid(id, bidId, edit)
      setHome(updated)
    } catch (e) {
      setError(e.message)
    }
  }
  async function saveContacts() {
    setError('')
    try {
      const normalized = contacts.map((c, i) => ({
        _id: c._id || undefined,
        company: c.company || '',
        fullName: c.fullName || '',
        email: c.email || '',
        phone: c.phone || '',
        isPrimary: !!c.isPrimary
      }))
      // ensure single primary
      if (normalized.filter(c => c.isPrimary).length === 0 && normalized.length) {
        normalized[0].isPrimary = true
      } else if (normalized.filter(c => c.isPrimary).length > 1) {
        const firstIdx = normalized.findIndex(c => c.isPrimary)
        normalized.forEach((c, idx) => { if (idx !== firstIdx) c.isPrimary = false })
      }
      // also sync vendor with primary contact for quick reference
      const primary = normalized.find(c => c.isPrimary)
      const vendor = primary ? {
        name: primary.company || '',
        contactName: primary.fullName || '',
        email: primary.email || '',
        phone: primary.phone || ''
      } : { name: '', contactName: '', email: '', phone: '' }
      const updated = await api.updateBid(id, bidId, { contacts: normalized, vendor })
      setHome(updated)
      // replace with latest server values
      const updatedBid = (updated?.trades || []).find((t) => t._id === bidId)
      setContacts(updatedBid?.contacts || [])
      setEdit((v) => ({ ...v, vendor: updatedBid?.vendor || vendor }))
      setContactEditMode(false)
    } catch (e) {
      setError(e.message)
    }
  }

  async function addDoc() {
    setError('')
    try {
      const res = await api.addDocument(id, { title: docForm.title, url: docForm.url, pinnedTo: { type: 'trade', id: bidId } })
      setHome(res.home)
      setDocForm({ title: '', url: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  async function addInvoice() {
    setError('')
    try {
      const payload = { label: invoiceForm.label, amount: Number(invoiceForm.amount || 0), dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate).toISOString() : undefined }
      const res = await api.addBidInvoice(id, bidId, payload)
      setHome(res.home)
      setInvoiceForm({ label: '', amount: '', dueDate: '' })
      setInvoiceDialogOpen(false)
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleInvoicePaid(invoiceId, currentPaid) {
    setError('')
    try {
      const res = await api.updateBidInvoice(id, bidId, invoiceId, { paid: !currentPaid })
      setHome(res)
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleTask(t) {
    setError('')
    try {
      const next = t.status === 'done' ? 'todo' : 'done'
      const updated = await api.updateTask(id, bidId, t._id, { status: next })
      setHome(updated)
    } catch (e) {
      setError(e.message)
    }
  }
  function openTask(task) {
    setTaskModal({ open: true, bidId, task })
    setTaskEdit({ title: task.title, description: task.description || '', dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [] })
    setSchedForm({ title: '', startsAt: '', endsAt: '' })
    setTaskMsgText('')
    setTaskMsgFiles([])
    api.listMessages(id, { taskId: task._id, limit: 50 }).then(setTaskMessages).catch(() => {})
  }
  function closeTask() {
    setTaskModal({ open: false, bidId: '', task: null })
  }
  async function saveTaskDetails() {
    try {
      const uniqueDeps = Array.isArray(taskEdit.dependsOn)
        ? Object.values(taskEdit.dependsOn.reduce((acc, d) => {
            const k = `${d.tradeId}:${d.taskId}`
            if (!acc[k]) acc[k] = { tradeId: d.tradeId, taskId: d.taskId }
            return acc
          }, {}))
        : []
      const updated = await api.updateTask(id, bidId, taskModal.task._id, {
        title: taskEdit.title,
        description: taskEdit.description,
        dependsOn: uniqueDeps
      })
      setHome(updated)
      closeTask()
    } catch (e) {
      setError(e.message)
    }
  }
  async function createTaskSchedule() {
    try {
      const payload = {
        title: schedForm.title,
        startsAt: schedForm.startsAt ? new Date(schedForm.startsAt).toISOString() : undefined,
        endsAt: schedForm.endsAt ? new Date(schedForm.endsAt).toISOString() : undefined,
        bidId,
        taskId: taskModal.task._id
      }
      const res = await api.addSchedule(id, payload)
      setHome(res.home)
      setSchedForm({ title: '', startsAt: '', endsAt: '' })
    } catch (e) {
      setError(e.message)
    }
  }
  async function sendTaskMessage() {
    setError('')
    try {
      const attachments = []
      for (const f of taskMsgFiles) {
        // reuse presigned upload used for trade messages
        attachments.push(await presignedUpload(f))
      }
      await api.createMessage(id, { text: taskMsgText, tradeId: bidId, taskId: taskModal.task._id, attachments })
      setTaskMsgText('')
      setTaskMsgFiles([])
      const list = await api.listMessages(id, { taskId: taskModal.task._id, limit: 50 })
      setTaskMessages(list || [])
    } catch (e) {
      setError(e.message)
    }
  }
  const allTasksFlat = useMemo(() => {
    const result = []
    for (const t of (home?.trades || [])) {
      for (const tk of (t.tasks || [])) {
        result.push({ tradeId: t._id, tradeName: t.name, taskId: tk._id, title: tk.title })
      }
    }
    return result
  }, [home])
  const dependencyOptions = useMemo(() => allTasksFlat.filter((tk) => tk.taskId !== (taskModal?.task?._id || '')), [allTasksFlat, taskModal?.task?._id])


  // Upload handled by shared dialog

  function isImage(u) {
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(u || '')
  }
  async function openPreview(url, title) {
    // For PDFs, try to fetch and display via blob URL to bypass attachment headers
    const isPdf = /\.pdf($|[\?#])/i.test(url || '')
    if (isPdf) {
      try {
        const res = await fetch(url, { mode: 'cors' })
        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        setPreview({ open: true, url: objUrl, title, isObjectUrl: true })
        return
      } catch {
        // fall back to direct url
      }
    }
    setPreview({ open: true, url, title, isObjectUrl: false })
  }
  function closePreview() {
    try {
      if (preview?.isObjectUrl && preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
    } catch {}
    setPreview({ open: false, url: '', title: '' })
  }

  // Initialize AI selection when dialog opens
  useEffect(() => {
    if (aiOpen) {
      const all = (bidPdfDocs || []).map((d) => d.url).filter(Boolean)
      setAiSelectedUrls(all)
    }
  }, [aiOpen, bidPdfDocs])

  function toggleAiUrl(u) {
    setAiSelectedUrls((arr) => (arr.includes(u) ? arr.filter((x) => x !== u) : [...arr, u]))
  }

  async function presignedUpload(file) {
    const presign = await api.presignUpload({ contentType: file.type || 'application/octet-stream', keyPrefix: `homes/${id}/messages/` })
    const form = new FormData()
    Object.entries(presign.fields || {}).forEach(([k, v]) => form.append(k, v))
    form.append('Content-Type', presign.contentType)
    form.append('file', file)
    const res = await fetch(presign.uploadUrl, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload failed')
    const url = presign.bucket && presign.region ? `https://${presign.bucket}.s3.${presign.region}.amazonaws.com/${presign.key}` : presign.uploadUrl
    return { title: file.name, url }
  }

  async function sendTradeMessage() {
    setError('')
    try {
      const attachments = []
      for (const f of msgFiles) {
        attachments.push(await presignedUpload(f))
      }
      await api.createMessage(id, { text: msgText, tradeId: bidId, attachments })
      setMsgText('')
      setMsgFiles([])
      const list = await api.listMessages(id, { tradeId: bidId, limit: 50 })
      setMsgList(list || [])
    } catch (e) {
      setError(e.message)
    }
  }

  if (!bid) {
    return <Typography variant="body2">Loading… {error && <span style={{ color: 'red' }}>{error}</span>}</Typography>
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{bid.name} (Trade)</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Contacts</Typography>
          {!contactEditMode ? (
            <Button variant="outlined" onClick={() => setContactEditMode(true)} startIcon={<EditIcon />}>Manage</Button>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="text" onClick={() => { setContactEditMode(false); setContacts(bid.contacts || contacts) }}>Cancel</Button>
              <Button variant="contained" onClick={saveContacts}>Save</Button>
            </Box>
          )}
        </Stack>
        {!contactEditMode ? (
          <Box sx={{ mt: 1 }}>
            {(Array.isArray(bid.contacts) ? bid.contacts : []).length ? (
              <List dense disablePadding>
                {bid.contacts.map((c, idx) => (
                  <div key={c._id || idx}>
                    <ListItem>
                      <ListItemText
                        primary={`${c.fullName || '—'} ${c.isPrimary ? '(Primary)' : ''}`}
                        secondary={<span>{[c.company || '—', c.email || '—', c.phone || '—'].join(' • ')}</span>}
                      />
                    </ListItem>
                    {idx < (bid.contacts.length - 1) && <Divider component="li" />}
                  </div>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No contact information</Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}><strong>Notes:</strong> {bid.notes || '—'}</Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Add or edit contacts. Only one can be primary.</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setContactDialog({ open: true, idx: -1, company: '', fullName: '', email: '', phone: '', isPrimary: contacts.length === 0 })}>
                Add Contact
              </Button>
            </Stack>
            <List dense disablePadding>
              {contacts.map((c, idx) => (
                <div key={c._id || idx}>
                  <ListItem
                    secondaryAction={
                      <Button size="small" variant="text" onClick={() => setContactDialog({ open: true, idx, company: c.company || '', fullName: c.fullName || '', email: c.email || '', phone: c.phone || '', isPrimary: !!c.isPrimary })}>
                        Edit
                      </Button>
                    }
                  >
                    <Radio
                      checked={!!c.isPrimary}
                      onChange={() => setContacts((arr) => arr.map((x, i) => ({ ...x, isPrimary: i === idx })))}
                    />
                    <ListItemText primary={`${c.fullName || '—'} ${c.isPrimary ? '(Primary)' : ''}`} secondary={<span>{[c.company || '—', c.email || '—', c.phone || '—'].join(' • ')}</span>} />
                  </ListItem>
                  {idx < contacts.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!contacts.length && <Typography variant="body2" color="text.secondary">No contact information</Typography>}
            </List>
            <TextField sx={{ mt: 2 }} label="Notes" value={edit?.notes || ''} onChange={(e) => setEdit((v) => ({ ...v, notes: e.target.value }))} fullWidth />
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Work</Typography>
          <Tabs value={workTab} onChange={(_, v) => setWorkTab(v)} aria-label="work tabs">
            <Tab label="Tasks" />
            <Tab label="Quality Checks" />
          </Tabs>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {workTab === 0 ? (
          <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button size="small" variant="contained" onClick={() => setAddDialog({ open: true, mode: 'task', bidId, title: '', desc: '', phaseKey: (bid.phaseKeys || [])[0] || 'preconstruction' })}>
                Add Task
              </Button>
            </Stack>
            <List dense disablePadding>
              {(bid.tasks || []).map((t, idx) => (
                <div key={t._id}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Task">
                          <IconButton size="small" onClick={() => openTask(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Checkbox edge="end" checked={t.status === 'done'} onChange={() => toggleTask(t)} />
                      </Box>
                    }
                  >
                    <ListItemText primary={t.title} secondary={`Phase: ${t.phaseKey}`} />
                  </ListItem>
                  {idx < (bid.tasks || []).length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!bid.tasks?.length && <Typography variant="body2" color="text.secondary">No tasks</Typography>}
            </List>
          </Box>
        ) : workTab === 1 ? (
          <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button size="small" variant="contained" onClick={() => setAddDialog({ open: true, mode: 'check', bidId, title: '', desc: '', phaseKey: (bid.phaseKeys || [])[0] || 'preconstruction' })}>
                Add Quality Check
              </Button>
            </Stack>
            <List dense disablePadding>
              {qualityChecks.map((qc, idx) => (
                <div key={qc._id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        size="small"
                        variant={qc.accepted ? 'outlined' : 'contained'}
                        onClick={async () => {
                          try {
                            const updated = await api.updateQualityCheck(id, bidId, qc._id, { accepted: !qc.accepted, acceptedBy: localStorage.getItem('userEmail') || '' })
                            setHome(updated)
                          } catch (e) {
                            setError(e.message)
                          }
                        }}
                      >
                        {qc.accepted ? 'Reopen' : 'Mark Accepted'}
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={qc.title}
                      secondary={[
                        `Phase: ${qc.phaseKey}`,
                        qc.accepted ? `Accepted${qc.acceptedBy ? ` by ${qc.acceptedBy}` : ''}${qc.acceptedAt ? ` @ ${new Date(qc.acceptedAt).toLocaleString()}` : ''}` : 'Pending'
                      ].join(' • ')}
                    />
                  </ListItem>
                  {idx < qualityChecks.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!qualityChecks.length && <Typography variant="body2" color="text.secondary">No quality checks</Typography>}
            </List>
          </Box>
        ) : null}
      </Paper>

      {/* Documents section for this Trade */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Documents</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" onClick={() => setCompareOpen(true)}>Compare Bids</Button>
            <Button variant="outlined" onClick={() => { setAiResult(''); setAiOpen(true) }}>Analyze with AI</Button>
            <Button variant="contained" onClick={() => setDocDialogOpen(true)}>Upload</Button>
          </Box>
        </Stack>
        <Tabs
          value={docTab}
          onChange={(_, v) => setDocTab(v)}
          aria-label="document tabs"
          sx={{ mt: 1 }}
        >
          <Tab label="All" />
          <Tab label="Contracts" />
          <Tab label="Bids" />
          <Tab label="Invoices" />
          <Tab label="Pictures" />
        </Tabs>
        <Divider sx={{ my: 1 }} />
        <List dense disablePadding sx={{ mt: 1 }}>
          {bidDocs
            .filter((d) => {
              const cat = (d.category || '').toLowerCase()
              if (docTab === 0) return true
              if (docTab === 1) return cat === 'contract'
              if (docTab === 2) return cat === 'bid'
              if (docTab === 3) return cat === 'invoice'
              if (docTab === 4) return cat === 'picture' || /\.(png|jpg|jpeg|webp|gif)$/i.test(d.url || '')
              return true
            })
            .map((d, idx, arr) => (
              <div key={d._id || `${idx}`}>
                <ListItem
                  secondaryAction={
                    d?.pinnedTo?.type === 'trade' && d?._id ? (
                      <Tooltip title="Delete file">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={async () => {
                            try {
                              if (!confirm('Delete this file from the project?')) return
                              const res = await api.deleteDocument(id, d._id)
                              setHome(res.home)
                            } catch (e) {
                              setError(e.message)
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={
                      <a href={d.url} onClick={(e) => { e.preventDefault(); openPreview(d.url, d.title) }}>
                        {d.title}
                      </a>
                    }
                    secondary={
                      <span>
                        {[d.fileName || (function () { try { const u = new URL(d.url || ''); const last = decodeURIComponent((u.pathname || '').split('/').pop() || ''); return last } catch { return '' } })(), d.createdAt ? `Uploaded: ${new Date(d.createdAt).toLocaleString()}` : ''].filter(Boolean).join(' • ')}
                      </span>
                    }
                  />
                </ListItem>
                {idx < (arr.length - 1) && <Divider component="li" />}
              </div>
            ))}
          {(!bidDocs || !bidDocs.length) && (
            <Typography variant="body2" color="text.secondary">No trade documents</Typography>
          )}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Financials</Typography>
          <Tabs value={finTab} onChange={(_, v) => setFinTab(v)} aria-label="financial tabs">
            <Tab label="Pricing" />
            <Tab label="Invoices" />
          </Tabs>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {finTab === 0 ? (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              {!priceEditMode ? (
                <>
                  <Typography variant="body1"><strong>Total Trade Price:</strong> {fmtCurrency(bid.totalPrice ?? 0)}</Typography>
                  <Button variant="outlined" onClick={() => { setPriceEditMode(true); setEdit((v) => ({ ...v, totalPrice: bid.totalPrice ?? 0 })) }}>Edit Price</Button>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="body2"><strong>Paid:</strong> {fmtCurrency(paidSum)}</Typography>
                  <Typography variant="body2"><strong>Outstanding:</strong> {fmtCurrency(outstanding)}</Typography>
                </>
              ) : (
                <>
                  <TextField
                    label="Total Trade Price"
                    type="number"
                    value={edit?.totalPrice ?? 0}
                    onChange={(e) => setEdit((v) => ({ ...v, totalPrice: Number(e.target.value) }))}
                    sx={{ maxWidth: 260 }}
                  />
                  <Button variant="contained" onClick={async () => { await save(); setPriceEditMode(false) }}>Save</Button>
                  <Button variant="text" onClick={() => { setPriceEditMode(false); setEdit((v) => ({ ...v, totalPrice: bid.totalPrice ?? 0 })) }}>Cancel</Button>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="body2"><strong>Paid:</strong> {fmtCurrency(paidSum)}</Typography>
                  <Typography variant="body2"><strong>Outstanding:</strong> {fmtCurrency(outstanding)}</Typography>
                </>
              )}
            </Stack>
          </Stack>
        ) : (
          <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button variant="contained" onClick={() => setInvoiceDialogOpen(true)}>Add New Invoice</Button>
            </Stack>
            <List dense disablePadding>
              {invoices.map((inv, idx) => (
                <div key={inv._id}>
                  <ListItem
                    secondaryAction={
                      <Button size="small" variant="text" onClick={() => toggleInvoicePaid(inv._id, inv.paid)}>
                        {inv.paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${inv.label} — ${fmtCurrency(inv.amount)} ${inv.paid ? '(Paid)' : ''}`}
                      secondary={inv.dueDate ? `Due: ${new Date(inv.dueDate).toLocaleDateString()}` : undefined}
                    />
                  </ListItem>
                  {idx < invoices.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!invoices.length && <Typography variant="body2" color="text.secondary">No invoices yet</Typography>}
            </List>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Info</Typography>
          <Tabs value={infoTab} onChange={(_, v) => setInfoTab(v)} aria-label="info tabs">
            <Tab label="Schedules" />
            <Tab label="Messages" />
          </Tabs>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {infoTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Upcoming schedules</Typography>
            <List dense disablePadding>
              {upcomingSchedules.map((s, idx) => (
                <div key={s._id}>
                  <ListItem>
                    <ListItemText
                      primary={s.title}
                      secondary={`${new Date(s.startsAt).toLocaleString()} → ${new Date(s.endsAt).toLocaleString()}`}
                    />
                  </ListItem>
                  {idx < upcomingSchedules.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!upcomingSchedules.length && <Typography variant="body2" color="text.secondary">No upcoming schedules</Typography>}
            </List>
          </Box>
        )}
        {infoTab === 1 && (
          <Box>
            <List dense disablePadding sx={{ mb: 2 }}>
              {msgList.map((m, idx) => (
                <div key={m._id}>
                  <ListItem>
                    <ListItemText
                      primary={m.text}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {m.author?.fullName || m.author?.email ? <Chip size="small" label={m.author?.fullName || m.author?.email} /> : null}
                          {(m.attachments || []).map((a, i) => (
                            <a
                              key={`${m._id}-a-${i}`}
                              href={a.url}
                              onClick={(e) => { e.preventDefault(); openPreview(a.url, a.title || `Attachment ${i + 1}`) }}
                            >
                              {a.title || `Attachment ${i + 1}`}
                            </a>
                          ))}
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < msgList.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!msgList.length && <Typography variant="body2" color="text.secondary">No messages yet</Typography>}
            </List>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <ChatBubbleOutlineIcon fontSize="small" />
              <TextField
                placeholder="Write a message…"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                fullWidth
                size="small"
              />
              <IconButton component="label" size="small">
                <AddPhotoAlternateIcon />
                <input type="file" accept="image/*" multiple hidden onChange={(e) => setMsgFiles(Array.from(e.target.files || []))} />
              </IconButton>
              <IconButton color="primary" onClick={sendTradeMessage} disabled={!msgText}>
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Contracts card moved into Work section as a tab */}

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Invoice / Payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Label" value={invoiceForm.label} onChange={(e) => setInvoiceForm((f) => ({ ...f, label: e.target.value }))} fullWidth />
            <TextField label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))} fullWidth />
            <TextField label="Due Date" type="date" InputLabelProps={{ shrink: true }} value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addInvoice}>Add</Button>
        </DialogActions>
      </Dialog>
      {/* Add/Edit Contact Dialog */}
      <Dialog open={contactDialog.open} onClose={() => setContactDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{contactDialog.idx >= 0 ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Company" value={contactDialog.company} onChange={(e) => setContactDialog((d) => ({ ...d, company: e.target.value }))} fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Full Name" value={contactDialog.fullName} onChange={(e) => setContactDialog((d) => ({ ...d, fullName: e.target.value }))} fullWidth />
              <TextField label="Phone" value={contactDialog.phone} onChange={(e) => setContactDialog((d) => ({ ...d, phone: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="Email" type="email" value={contactDialog.email} onChange={(e) => setContactDialog((d) => ({ ...d, email: e.target.value }))} fullWidth />
            <RadioGroup
              row
              value={contactDialog.isPrimary ? 'yes' : 'no'}
              onChange={(_, v) => setContactDialog((d) => ({ ...d, isPrimary: v === 'yes' }))}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Primary" />
              <FormControlLabel value="no" control={<Radio />} label="Secondary" />
            </RadioGroup>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            setContacts((arr) => {
              const next = [...arr]
              const payload = {
                ...(contactDialog.idx >= 0 ? next[contactDialog.idx] : {}),
                company: contactDialog.company,
                fullName: contactDialog.fullName,
                email: contactDialog.email,
                phone: contactDialog.phone,
                isPrimary: contactDialog.isPrimary
              }
              if (contactDialog.idx >= 0) {
                next[contactDialog.idx] = payload
              } else {
                next.push(payload)
              }
              // ensure uniqueness of primary
              if (payload.isPrimary) {
                const idx = contactDialog.idx >= 0 ? contactDialog.idx : next.length - 1
                return next.map((c, i) => ({ ...c, isPrimary: i === idx }))
              }
              return next
            })
            setContactDialog((d) => ({ ...d, open: false }))
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Task Details Dialog (same format as Progress by phase pages) */}
      <Dialog open={taskModal.open} onClose={closeTask} fullWidth maxWidth="sm">
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={taskEdit.title}
              onChange={(e) => setTaskEdit((te) => ({ ...te, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={taskEdit.description}
              onChange={(e) => setTaskEdit((te) => ({ ...te, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
            <Typography variant="subtitle2">Create Schedule</Typography>
            <TextField label="Schedule Title" value={schedForm.title} onChange={(e) => setSchedForm((s) => ({ ...s, title: e.target.value }))} fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Starts At" type="datetime-local" InputLabelProps={{ shrink: true }} value={schedForm.startsAt} onChange={(e) => setSchedForm((s) => ({ ...s, startsAt: e.target.value }))} fullWidth />
              <TextField label="Ends At" type="datetime-local" InputLabelProps={{ shrink: true }} value={schedForm.endsAt} onChange={(e) => setSchedForm((s) => ({ ...s, endsAt: e.target.value }))} fullWidth />
            </Stack>
            <Button variant="outlined" onClick={createTaskSchedule}>Add Schedule</Button>
            <Typography variant="subtitle2">Dependencies</Typography>
            <FormControl fullWidth>
              <InputLabel id="deps">Depends on</InputLabel>
              <Select
                labelId="deps"
                label="Depends on"
                multiple
                renderValue={(selected) => {
                  const arr = Array.isArray(selected) ? selected : []
                  if (!arr.length) return 'None'
                  const labels = []
                  for (const dep of arr) {
                    const found = allTasksFlat.find((x) => x.tradeId === dep.tradeId && x.taskId === dep.taskId)
                    if (found) labels.push(`${found.tradeName} — ${found.title}`)
                  }
                  return labels.join(', ')
                }}
                value={Array.isArray(taskEdit.dependsOn) ? taskEdit.dependsOn : []}
                onChange={(e) => {
                  // e.target.value will be array of objects; ensure shape {tradeId, taskId}
                  const val = e.target.value
                  setTaskEdit((te) => ({ ...te, dependsOn: val }))
                }}
              >
                {dependencyOptions.map((opt) => (
                  <MenuItem key={`${opt.tradeId}:${opt.taskId}`} value={{ tradeId: opt.tradeId, taskId: opt.taskId }}>
                    {`${opt.tradeName} — ${opt.title}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="subtitle2">Upload Document/Photo</Typography>
            <Button variant="contained" onClick={() => setTaskUploadOpen(true)}>Upload Document</Button>
            <Divider />
            <Typography variant="subtitle2">Documents</Typography>
            <List dense disablePadding>
              {taskDocs.map((d, idx) => (
                <div key={d._id || idx}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {d.title || d.fileName || 'Document'}
                        </a>
                      }
                      secondary={d.uploadedBy?.fullName || d.uploadedBy?.email ? `Uploaded by ${d.uploadedBy.fullName || d.uploadedBy.email}` : undefined}
                    />
                  </ListItem>
                  {idx < taskDocs.length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!taskDocs.length && <Typography variant="body2" color="text.secondary">No documents attached</Typography>}
            </List>
            <Divider />
            <Typography variant="subtitle2">Messages</Typography>
            <List dense disablePadding>
              {(taskMessages || []).map((m, idx) => (
                <div key={m._id}>
                  <ListItem>
                    <ListItemText
                      primary={m.text}
                      secondary={<span>{new Date(m.createdAt).toLocaleString()}</span>}
                    />
                  </ListItem>
                  {idx < (taskMessages || []).length - 1 && <Divider component="li" />}
                </div>
              ))}
              {!taskMessages.length && <Typography variant="body2" color="text.secondary">No messages yet</Typography>}
            </List>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <TextField
                placeholder="Write a message…"
                value={taskMsgText}
                onChange={(e) => setTaskMsgText(e.target.value)}
                fullWidth
                size="small"
              />
              <IconButton component="label" size="small">
                <AddPhotoAlternateIcon />
                <input type="file" accept="image/*" multiple hidden onChange={(e) => setTaskMsgFiles(Array.from(e.target.files || []))} />
              </IconButton>
              <IconButton color="primary" onClick={sendTaskMessage} disabled={!taskMsgText}>
                <SendIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTask}>Close</Button>
          <Button onClick={saveTaskDetails} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <UploadDocumentDialog
        open={taskUploadOpen}
        onClose={() => setTaskUploadOpen(false)}
        homeId={id}
        trades={home?.trades || []}
        defaultPinnedType="task"
        defaultTaskId={taskModal.task?._id || ''}
        lockDefaults
        onCompleted={(updatedHome) => setHome(updatedHome)}
      />

      <UploadDocumentDialog
        open={docDialogOpen}
        onClose={() => setDocDialogOpen(false)}
        homeId={id}
        trades={home?.trades || []}
        defaultPinnedType="trade"
        defaultTradeId={bidId}
        onCompleted={(updatedHome) => setHome(updatedHome)}
      />

      <Dialog open={preview.open} onClose={closePreview} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{preview.title}</span>
          <IconButton onClick={closePreview} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ height: '80vh', p: 0 }}>
          {isImage(preview.url) ? (
            <img src={preview.url} alt={preview.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <iframe title={preview.title} src={preview.url} style={{ width: '100%', height: '100%', border: 0 }} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onClose={() => setAiOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Analyze Trade Documents with AI</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {`Select which documents to include (${aiSelectedUrls.length} selected of ${aiCandidateDocs.length}). Adjust the prompt below if needed:`}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={aiIncludeImages}
                onChange={(e) => {
                  const on = e.target.checked
                  setAiIncludeImages(on)
                  if (!on) {
                    setAiSelectedUrls((prev) => prev.filter(u => /\.pdf($|[\\?#])/i.test(u)))
                  } else {
                    const all = (aiCandidateDocs || []).map(d => d.url).filter(Boolean)
                    setAiSelectedUrls(all)
                  }
                }}
              />
              <Typography variant="body2">Include image files (pictures/diagrams)</Typography>
            </Stack>
            <TextField
              label="Analysis prompt"
              multiline
              minRows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              fullWidth
            />
            <Box sx={{ maxHeight: 260, overflow: 'auto', border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1 }}>
              {aiCandidateDocs.map((d, idx) => (
                <div key={d._id || `${idx}`}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox
                      size="small"
                      checked={aiSelectedUrls.includes(d.url)}
                      onChange={() => toggleAiUrl(d.url)}
                    />
                    <Typography variant="caption" display="block" noWrap title={d.title || d.url}>
                      {d.title || d.url}
                    </Typography>
                  </Stack>
                </div>
              ))}
              {!aiCandidateDocs.length && <Typography variant="caption" color="text.secondary">No documents attached to this trade.</Typography>}
            </Box>
            {aiResult ? (
              <Box sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Results</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiResult}</Box>
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiOpen(false)} disabled={aiLoading}>Close</Button>
          <Button
            variant="contained"
            disabled={aiLoading || aiSelectedUrls.length === 0}
            onClick={async () => {
              setAiLoading(true)
              setAiResult('')
              try {
                const urls = aiSelectedUrls
                const resp = await api.analyzeTrade({ homeId: id, tradeId: bidId, urls, prompt: aiPrompt })
                setAiResult(resp.result || JSON.stringify(resp, null, 2))
              } catch (e) {
                setAiResult(`Error: ${e.message}`)
              } finally {
                setAiLoading(false)
              }
            }}
          >
            {aiLoading ? <CircularProgress size={20} /> : 'Run analysis'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Task/Quality Check Dialog */}
      <Dialog open={addDialog?.open} onClose={() => setAddDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{addDialog?.mode === 'task' ? 'Add Task' : 'Add Quality Check'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={addDialog?.title || ''}
              onChange={(e) => setAddDialog((d) => ({ ...d, title: e.target.value }))}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label={addDialog?.mode === 'task' ? 'Description' : 'Notes'}
              value={addDialog?.desc || ''}
              onChange={(e) => setAddDialog((d) => ({ ...d, desc: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Phase"
              value={(addDialog?.phaseKey) || ((bid.phaseKeys || [])[0] || 'preconstruction')}
              onChange={(e) => setAddDialog((d) => ({ ...d, phaseKey: e.target.value }))}
              select
              fullWidth
            >
              {(bid.phaseKeys || ['preconstruction', 'exterior', 'interior']).map((p) => (<option key={p} value={p}>{p}</option>))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button onClick={async () => {
            setError('')
            try {
              if (addDialog.mode === 'task') {
                const body = { title: addDialog.title, description: addDialog.desc, phaseKey: addDialog.phaseKey || (bid.phaseKeys || [])[0] }
                const res = await api.addTask(id, bidId, body)
                setHome(res.home)
              } else {
                const body = { title: addDialog.title, notes: addDialog.desc, phaseKey: addDialog.phaseKey || (bid.phaseKeys || [])[0] }
                const res = await api.addHomeQualityCheck(id, bidId, body)
                setHome(res.home)
              }
              setAddDialog({ open: false, mode: 'task', bidId, title: '', desc: '', phaseKey: (bid.phaseKeys || [])[0] || 'preconstruction' })
            } catch (e) {
              setError(e.message)
            }
          }} variant="contained" disabled={!addDialog?.title}>Add</Button>
        </DialogActions>
      </Dialog>
      <BidCompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        homeId={id}
        tradeId={bidId}
        existingDocs={bidPdfDocs}
        onAfterUpload={(updatedHome) => setHome(updatedHome)}
      />
    </Stack>
  )
}


