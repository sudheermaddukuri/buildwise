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
import IconButton from '@mui/material/IconButton'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import SendIcon from '@mui/icons-material/Send'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'

export default function HomeBidDetail() {
  const { id, bidId } = useParams()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(null)
  const [docForm, setDocForm] = useState({ title: '', url: '' })
  const [contactEditMode, setContactEditMode] = useState(false)
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

  useEffect(() => {
    api.getHome(id).then((h) => {
      setHome(h)
      const b = (h?.trades || []).find((x) => x._id === bidId)
      if (b) {
        setEdit({ vendor: { ...(b.vendor || {}) }, totalPrice: b.totalPrice || 0, totalPaid: b.totalPaid || 0, notes: b.notes || '' })
        const v = b.vendor || {}
        const hasVendor = Boolean(v.name || v.contactName || v.email || v.phone)
        setContactEditMode(!hasVendor)
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
  const invoices = useMemo(() => (bid?.invoices || []), [bid])
  const paidSum = useMemo(() => invoices.filter(i => i.paid).reduce((s, i) => s + (Number(i.amount) || 0), 0), [invoices])
  const outstanding = useMemo(() => Math.max((Number(bid?.totalPrice ?? 0)) - paidSum, 0), [bid, paidSum])
  const fmtCurrency = (n) => {
    const v = Number(n || 0)
    return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  }
  const bidSchedules = useMemo(() => (home?.schedules || []).filter((s) => s.bidId === bidId), [home, bidId])
  const qualityChecks = useMemo(() => (bid?.qualityChecks || []), [bid])

  async function save() {
    setError('')
    try {
      const updated = await api.updateBid(id, bidId, edit)
      setHome(updated)
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
        <Typography variant="subtitle1" gutterBottom>Trade Contact</Typography>
        {!contactEditMode ? (
          <Box>
            <Typography variant="body2"><strong>Company:</strong> {bid.vendor?.name || '—'}</Typography>
            <Typography variant="body2"><strong>Contact:</strong> {bid.vendor?.contactName || '—'}</Typography>
            <Typography variant="body2"><strong>Email:</strong> {bid.vendor?.email || '—'}</Typography>
            <Typography variant="body2"><strong>Phone:</strong> {bid.vendor?.phone || '—'}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}><strong>Notes:</strong> {bid.notes || '—'}</Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setContactEditMode(true)}>Edit Contact</Button>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Vendor Company" value={edit?.vendor?.name || ''} onChange={(e) => setEdit((v) => ({ ...v, vendor: { ...(v?.vendor || {}), name: e.target.value } }))} fullWidth />
              <TextField label="Contact Name" value={edit?.vendor?.contactName || ''} onChange={(e) => setEdit((v) => ({ ...v, vendor: { ...(v?.vendor || {}), contactName: e.target.value } }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Email" value={edit?.vendor?.email || ''} onChange={(e) => setEdit((v) => ({ ...v, vendor: { ...(v?.vendor || {}), email: e.target.value } }))} fullWidth />
              <TextField label="Phone" value={edit?.vendor?.phone || ''} onChange={(e) => setEdit((v) => ({ ...v, vendor: { ...(v?.vendor || {}), phone: e.target.value } }))} fullWidth />
            </Stack>
            <TextField label="Notes" value={edit?.notes || ''} onChange={(e) => setEdit((v) => ({ ...v, notes: e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save}>Save</Button>
              <Button variant="text" onClick={() => { setContactEditMode(false); setEdit({ vendor: { ...(bid.vendor || {}) }, totalPrice: bid.totalPrice || 0, totalPaid: bid.totalPaid || 0, notes: bid.notes || '' }) }}>Cancel</Button>
            </Stack>
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Quality Checks</Typography>
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
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Pricing & Invoices</Typography>
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
          <Divider />
          <Button variant="contained" onClick={() => setInvoiceDialogOpen(true)}>Add New Invoice</Button>
          <List dense disablePadding sx={{ mt: 1 }}>
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
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Trade Messages</Typography>
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
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Contracts / Documents</Typography>
        <Button variant="contained" onClick={() => setDocDialogOpen(true)}>Add Document</Button>
        <List dense disablePadding sx={{ mt: 2 }}>
          {bidDocs.map((d, idx) => (
            <div key={d._id || `${idx}`}>
              <ListItem>
                <ListItemText
                  primary={
                    <a href={d.url} onClick={(e) => { e.preventDefault(); openPreview(d.url, d.title) }}>
                      {d.title}
                    </a>
                  }
                />
              </ListItem>
              {idx < bidDocs.length - 1 && <Divider component="li" />}
            </div>
          ))}
          {!bidDocs.length && <Typography variant="body2" color="text.secondary">No trade documents</Typography>}
        </List>
      </Paper>

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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Schedules for this Trade</Typography>
        <List dense disablePadding>
          {bidSchedules.map((s, idx) => (
            <div key={s._id}>
              <ListItem>
                <ListItemText
                  primary={s.title}
                  secondary={`${new Date(s.startsAt).toLocaleString()} → ${new Date(s.endsAt).toLocaleString()}`}
                />
              </ListItem>
              {idx < bidSchedules.length - 1 && <Divider component="li" />}
            </div>
          ))}
          {!bidSchedules.length && <Typography variant="body2" color="text.secondary">No schedules for this bid</Typography>}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Tasks</Typography>
        <List dense disablePadding>
          {(bid.tasks || []).map((t, idx) => (
            <div key={t._id}>
              <ListItem secondaryAction={
                <Checkbox edge="end" checked={t.status === 'done'} onChange={() => toggleTask(t)} />
              }>
                <ListItemText primary={t.title} secondary={`Phase: ${t.phaseKey}`} />
              </ListItem>
              {idx < (bid.tasks || []).length - 1 && <Divider component="li" />}
            </div>
          ))}
          {!bid.tasks?.length && <Typography variant="body2" color="text.secondary">No tasks</Typography>}
        </List>
      </Paper>
    </Stack>
  )
}


