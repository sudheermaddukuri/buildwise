import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import BidCompareDialog from '../components/BidCompareDialog.jsx'

const BID_TYPES = [
  'electrical','plumbing','hvac','roofing','drywall','painting','flooring','cabinets','countertops','tile','insulation','windows & doors','finish carpentry','concrete','landscaping'
]

export default function HomeTools() {
  const { id } = useParams()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareConfigOpen, setCompareConfigOpen] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState('')
  const [selectedBidType, setSelectedBidType] = useState('')
  const [compareDefaults, setCompareDefaults] = useState({ tradeId: '', extra: '' })
  const [archOpen, setArchOpen] = useState(false)
  const [archBusy, setArchBusy] = useState(false)
  const [archError, setArchError] = useState('')
  const [archResult, setArchResult] = useState(null)
  const [archFile, setArchFile] = useState(null)
  const [qcOpen, setQcOpen] = useState(false)
  const [qcBusy, setQcBusy] = useState(false)
  const [unschedOpen, setUnschedOpen] = useState(false)
  const [unschedBusy, setUnschedBusy] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)

  useEffect(() => {
    api.getHome(id).then(setHome).catch((e) => setError(e.message))
  }, [id])

  const tradeDocsById = useMemo(() => {
    const map = {}
    const docs = Array.isArray(home?.documents) ? home.documents : []
    for (const d of docs) {
      if (d?.pinnedTo?.type === 'trade' && d?.pinnedTo?.id) {
        const arr = map[d.pinnedTo.id] || (map[d.pinnedTo.id] = [])
        arr.push(d)
      }
    }
    return map
  }, [home])

  async function uploadTemp(file, folderName) {
    const form = new FormData()
    form.append('title', file.name)
    form.append('file', file)
    form.append('folderName', folderName)
    const res = await fetch(`${import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:5051/api')}/file-storage/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: form
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || 'Upload failed')
    }
    const data = await res.json()
    return { url: data?.data?.fileUrl || '', fileName: data?.data?.fileName || file.name }
  }

  const pendingQualityChecks = useMemo(() => {
    const list = []
    for (const t of (home?.trades || [])) {
      for (const q of (t.qualityChecks || [])) {
        if (!q.accepted) list.push({ trade: t, check: q })
      }
    }
    return list
  }, [home])

  const scheduledTaskIds = useMemo(() => {
    const set = new Set()
    for (const s of (home?.schedules || [])) {
      if (s?.taskId) set.add(String(s.taskId))
    }
    return set
  }, [home])

  const unscheduledTasks = useMemo(() => {
    const out = []
    for (const t of (home?.trades || [])) {
      for (const task of (t.tasks || [])) {
        const idStr = String(task._id)
        if (!scheduledTaskIds.has(idStr)) {
          out.push({ trade: t, task })
        }
      }
    }
    return out
  }, [home, scheduledTaskIds])

  const budgetSummary = useMemo(() => {
    const trades = home?.trades || []
    const totalBudget = trades.reduce((s, t) => s + (Number(t.totalPrice) || 0), 0)
    const totalPaid = trades.reduce((s, t) => s + (t.invoices || []).filter(i => i.paid).reduce((x, i) => x + (Number(i.amount) || 0), 0), 0)
    const totalInvoiced = trades.reduce((s, t) => s + (t.invoices || []).reduce((x, i) => x + (Number(i.amount) || 0), 0), 0)
    const totalExtras = trades.reduce((s, t) => s + (t.additionalCosts || []).reduce((x, c) => x + (Number(c.amount) || 0), 0), 0)
    const totalOutstanding = Math.max(totalBudget - totalPaid, 0)
    const totalVariance = (totalInvoiced + totalExtras) - totalBudget
    return { totalBudget, totalPaid, totalInvoiced, totalExtras, totalOutstanding, totalVariance }
  }, [home])

  const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Tools</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Bid Comparison</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Compare two or more vendor bid PDFs for a selected trade. Choose bid type to tailor the analysis.
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => { setSelectedTradeId(''); setSelectedBidType(''); setCompareConfigOpen(true) }} size="small" variant="contained">Open</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Architecture Analysis</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Upload a drawing (PDF/image) to extract house, roof, and exterior types.
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => { setArchError(''); setArchResult(null); setArchFile(null); setArchOpen(true) }} size="small">Open</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Pending Quality Checks</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Review and complete open quality checks across all trades.
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => setQcOpen(true)} size="small">Open</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Unscheduled Tasks</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Find tasks without schedule entries; quickly mark complete if done.
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => setUnschedOpen(true)} size="small">Open</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Budget Snapshot</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Quick view of budget, paid, invoiced, extras, and variance.
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => setBudgetOpen(true)} size="small">Open</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Bid Comparison Config Dialog */}
      <Dialog open={compareConfigOpen} onClose={() => setCompareConfigOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Bid Comparison</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="trade-select">Trade</InputLabel>
              <Select labelId="trade-select" label="Trade" value={selectedTradeId} onChange={(e) => setSelectedTradeId(e.target.value)}>
                {(home?.trades || []).map((t) => (
                  <MenuItem value={t._id} key={t._id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="bid-type">Bid Type</InputLabel>
              <Select labelId="bid-type" label="Bid Type" value={selectedBidType} onChange={(e) => setSelectedBidType(e.target.value)}>
                {BID_TYPES.map((bt) => (<MenuItem key={bt} value={bt}>{bt}</MenuItem>))}
              </Select>
            </FormControl>
            <Alert severity="info">We will tailor the comparison to the selected bid type.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareConfigOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const tId = selectedTradeId || ''
              if (!tId) return
              setCompareDefaults({ tradeId: tId, extra: selectedBidType ? `Bid type: ${selectedBidType}` : '' })
              setCompareConfigOpen(false)
              setCompareOpen(true)
            }}
            disabled={!selectedTradeId}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Embedded BidCompareDialog */}
      <BidCompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        homeId={id}
        tradeId={compareDefaults.tradeId}
        existingDocs={(tradeDocsById[compareDefaults.tradeId] || [])}
        defaultExtraContext={compareDefaults.extra}
        onAfterUpload={(updated) => setHome(updated)}
      />

      {/* Architecture Analysis Dialog */}
      <Dialog open={archOpen} onClose={() => (!archBusy ? setArchOpen(false) : null)} fullWidth maxWidth="sm">
        <DialogTitle>Architecture Analysis</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Upload a PDF or image.</Typography>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setArchFile(e.target.files?.[0] || null)} />
            {archError && <Alert severity="error">{archError}</Alert>}
            {archResult && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" gutterBottom>Detected</Typography>
                <Typography variant="body2">House Type: {archResult.houseType || '—'}</Typography>
                <Typography variant="body2">Roof Type: {archResult.roofType || '—'}</Typography>
                <Typography variant="body2">Exterior Type: {archResult.exteriorType || '—'}</Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchOpen(false)} disabled={archBusy}>Close</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setArchError('')
              try {
                if (!archFile) return
                setArchBusy(true)
                const uploaded = await uploadTemp(archFile, `homes/${id}/tools/architecture`)
                const res = await api.analyzeArchitecture({ urls: [uploaded.url] })
                setArchResult({ houseType: res?.houseType || '', roofType: res?.roofType || '', exteriorType: res?.exteriorType || '' })
              } catch (e) {
                setArchError(e.message || 'Analysis failed')
              } finally {
                setArchBusy(false)
              }
            }}
            disabled={!archFile || archBusy}
          >
            {archBusy ? <CircularProgress size={18} /> : 'Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pending Quality Checks Dialog */}
      <Dialog open={qcOpen} onClose={() => (!qcBusy ? setQcOpen(false) : null)} fullWidth maxWidth="sm">
        <DialogTitle>Pending Quality Checks</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {pendingQualityChecks.map(({ trade, check }) => (
              <Paper key={check._id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <div>
                    <Typography variant="subtitle2">{trade.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{check.title}</Typography>
                  </div>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      try {
                        setQcBusy(true)
                        const updated = await api.updateQualityCheck(id, trade._id, check._id, { accepted: true, acceptedBy: (localStorage.getItem('userEmail') || '') })
                        setHome(updated)
                      } finally {
                        setQcBusy(false)
                      }
                    }}
                  >
                    Mark Completed
                  </Button>
                </Stack>
              </Paper>
            ))}
            {!pendingQualityChecks.length && <Typography variant="body2" color="text.secondary">No pending quality checks.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQcOpen(false)} disabled={qcBusy}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Unscheduled Tasks Dialog */}
      <Dialog open={unschedOpen} onClose={() => (!unschedBusy ? setUnschedOpen(false) : null)} fullWidth maxWidth="sm">
        <DialogTitle>Unscheduled Tasks</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {unscheduledTasks.map(({ trade, task }) => (
              <Paper key={task._id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <div>
                    <Typography variant="subtitle2">{trade.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{task.title}</Typography>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      try {
                        setUnschedBusy(true)
                        const updated = await api.updateTask(id, trade._id, task._id, { status: 'done', completedBy: (localStorage.getItem('userEmail') || '') })
                        setHome(updated)
                      } finally {
                        setUnschedBusy(false)
                      }
                    }}
                  >
                    Mark Done
                  </Button>
                </Stack>
              </Paper>
            ))}
            {!unscheduledTasks.length && <Typography variant="body2" color="text.secondary">All tasks have schedules or none exist.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnschedOpen(false)} disabled={unschedBusy}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Budget Snapshot Dialog */}
      <Dialog open={budgetOpen} onClose={() => setBudgetOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Budget Snapshot</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">Total Budget: {fmtMoney(budgetSummary.totalBudget)}</Typography>
            <Typography variant="body2">Paid: {fmtMoney(budgetSummary.totalPaid)}</Typography>
            <Typography variant="body2">Invoiced (All): {fmtMoney(budgetSummary.totalInvoiced)}</Typography>
            <Typography variant="body2">Additional Costs: {fmtMoney(budgetSummary.totalExtras)}</Typography>
            <Typography variant="body2">Outstanding: {fmtMoney(budgetSummary.totalOutstanding)}</Typography>
            <Typography variant="body2" sx={{ color: budgetSummary.totalVariance > 0 ? 'error.main' : 'success.main' }}>
              Variance: {fmtMoney(budgetSummary.totalVariance)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}


