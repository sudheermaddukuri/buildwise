import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import { useNavigate } from 'react-router-dom'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LaunchIcon from '@mui/icons-material/Launch'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import UndoIcon from '@mui/icons-material/Undo'
import EditIcon from '@mui/icons-material/Edit'
import AddTaskIcon from '@mui/icons-material/AddTask'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import SendIcon from '@mui/icons-material/Send'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'
import DependencyGraph from '../components/DependencyGraph.jsx'
import PhaseTimeline from '../components/PhaseTimeline.jsx'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

const ALL_PHASES = ['preconstruction', 'exterior', 'interior']

export default function HomeDetail() {
  const { id, phase } = useParams()
  const navigate = useNavigate()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    let mounted = true
    api.getHome(id)
      .then((data) => { if (mounted) { setHome(data) } })
      .catch((e) => { if (mounted) { setError(e.message) } })
    return () => { mounted = false }
  }, [id])

  const currentPhase = (phase === 'exterior' || phase === 'interior') ? phase : 'preconstruction'

  const bidsForPhase = useMemo(() => {
    if (!home?.trades) return []
    return home.trades.filter((b) => (b.phaseKeys || []).includes(currentPhase))
  }, [home, currentPhase])

  function tasksForPhase(bid) {
    const tasks = bid.tasks || []
    return tasks.filter((t) => {
      if (t.phaseKey) return t.phaseKey === currentPhase
      // Backward compatibility: if task has no phaseKey, include it when the bid is associated to this phase
      return (bid.phaseKeys || []).includes(currentPhase)
    })
  }

  function qualityChecksForPhase(bid) {
    const checks = bid.qualityChecks || []
    return checks.filter((q) => q.phaseKey === currentPhase)
  }

  const progress = useMemo(() => {
    const tasks = bidsForPhase.flatMap((b) => tasksForPhase(b))
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [bidsForPhase])

  async function toggleTask(bidId, task) {
    try {
      const next = task.status === 'done' ? 'todo' : 'done'
      const completedBy = next === 'done' ? (localStorage.getItem('userEmail') || '') : ''
      const updated = await api.updateTask(id, bidId, task._id, { status: next, completedBy })
      setHome(updated)
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleQualityCheck(bidId, qc) {
    try {
      const updated = await api.updateQualityCheck(id, bidId, qc._id, {
        accepted: !qc.accepted,
        acceptedBy: !qc.accepted ? (localStorage.getItem('userEmail') || '') : ''
      })
      setHome(updated)
    } catch (e) {
      setError(e.message)
    }
  }

  async function attachUrlToTask(taskId) {
    // deprecated by task modal
  }

  const [taskModal, setTaskModal] = useState({ open: false, bidId: '', task: null })
  const [taskEdit, setTaskEdit] = useState({ title: '', description: '' })
  const [schedForm, setSchedForm] = useState({ title: '', startsAt: '', endsAt: '' })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [addDialog, setAddDialog] = useState({ open: false, mode: 'task', bidId: '', title: '', desc: '', phaseKey: currentPhase })
  const [taskMessages, setTaskMessages] = useState([])
  const [taskMsgText, setTaskMsgText] = useState('')
  const [taskMsgFiles, setTaskMsgFiles] = useState([])
  const [taskUploadOpen, setTaskUploadOpen] = useState(false)
  const [viewTab, setViewTab] = useState(0) // 0=list, 1=interactive

  const taskDocs = useMemo(() => {
    const docs = home?.documents || []
    const taskId = taskModal?.task?._id
    if (!taskId) return []
    return docs.filter((d) => d?.pinnedTo?.type === 'task' && d?.pinnedTo?.id === taskId)
  }, [home, taskModal?.task?._id])

  function openTask(bidId, task) {
    setTaskModal({ open: true, bidId, task })
    setTaskEdit({ title: task.title, description: task.description || '' })
    setSchedForm({ title: '', startsAt: '', endsAt: '' })
    setUploadFile(null)
    setUploadTitle('')
    // load messages for this task
    api.listMessages(id, { taskId: task._id, limit: 50 }).then(setTaskMessages).catch(() => {})
  }
  function closeTask() {
    setTaskModal({ open: false, bidId: '', task: null })
  }

  async function saveTaskDetails() {
    try {
      const updated = await api.updateTask(id, taskModal.bidId, taskModal.task._id, {
        title: taskEdit.title,
        description: taskEdit.description
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
        bidId: taskModal.bidId,
        taskId: taskModal.task._id
      }
      const res = await api.addSchedule(id, payload)
      setHome(res.home)
      setSchedForm({ title: '', startsAt: '', endsAt: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  // Upload handled by shared dialog

  async function presignMessageUpload(file) {
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

  async function sendTaskMessage() {
    setError('')
    try {
      const attachments = []
      for (const f of taskMsgFiles) {
        attachments.push(await presignMessageUpload(f))
      }
      await api.createMessage(id, { text: taskMsgText, tradeId: taskModal.bidId, taskId: taskModal.task._id, attachments })
      setTaskMsgText('')
      setTaskMsgFiles([])
      const list = await api.listMessages(id, { taskId: taskModal.task._id, limit: 50 })
      setTaskMessages(list || [])
    } catch (e) {
      setError(e.message)
    }
  }

  async function submitAddDialog() {
    try {
      if (addDialog.mode === 'task') {
        const body = { title: addDialog.title, description: addDialog.desc, phaseKey: addDialog.phaseKey }
        const res = await api.addTask(id, addDialog.bidId, body)
        setHome(res.home)
      } else {
        const body = { title: addDialog.title, notes: addDialog.desc, phaseKey: addDialog.phaseKey }
        const res = await api.addHomeQualityCheck(id, addDialog.bidId, body)
        setHome(res.home)
      }
      setAddDialog({ open: false, mode: 'task', bidId: '', title: '', desc: '', phaseKey: currentPhase })
    } catch (e) {
      setError(e.message)
    }
  }

  if (!home) {
    return (
      <Typography variant="body1">
        Loading… {error && <Box component="span" sx={{ color: 'error.main' }}>{error}</Box>}
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Phase View</Typography>
          <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} aria-label="phase view">
            <Tab label="List" />
            <Tab label="Interactive" />
          </Tabs>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Total Progress</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress variant="determinate" value={progress.pct} />
          </Box>
          <Typography variant="body2">{progress.pct}% ({progress.done}/{progress.total})</Typography>
        </Box>
      </Paper>

      {viewTab === 0 ? (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{currentPhase} Trades</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {bidsForPhase.length ? (
          <List dense disablePadding>
            {bidsForPhase.map((b, idx) => (
              <Box key={b._id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ flex: 1 }}>{b.name}</Typography>
                        <Tooltip title="Open Trade">
                          <IconButton size="small" onClick={() => navigate(`/homes/${id}/trades/${b._id}`)}>
                            <LaunchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {/* Tasks in this phase */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="subtitle2">Tasks</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Add Task">
                              <IconButton
                                size="small"
                                onClick={() => setAddDialog({ open: true, mode: 'task', bidId: b._id, title: '', desc: '', phaseKey: currentPhase })}
                              >
                                <AddTaskIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add Quality Check">
                              <IconButton
                                size="small"
                                onClick={() => setAddDialog({ open: true, mode: 'check', bidId: b._id, title: '', desc: '', phaseKey: currentPhase })}
                              >
                                <FactCheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        {tasksForPhase(b).length ? (
                          <Box sx={{ mb: 1 }}>
                            {tasksForPhase(b).map((t) => (
                              <Box key={t._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ flex: 1, minWidth: 240 }}>{t.title}</Typography>
                                {t.status === 'done' && (
                                  <Chip size="small" color="success" label={`Done${t.completedBy ? ` by ${t.completedBy}` : ''}${t.completedAt ? ` @ ${new Date(t.completedAt).toLocaleString()}` : ''}`} />
                                )}
                                <Tooltip title={t.status === 'done' ? 'Reopen Task' : 'Mark Done'}>
                                  <IconButton size="small" color={t.status === 'done' ? 'default' : 'primary'} onClick={() => toggleTask(b._id, t)}>
                                    {t.status === 'done' ? <UndoIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Open Task">
                                  <IconButton size="small" onClick={() => openTask(b._id, t)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No tasks</Typography>
                        )}

                        {/* Quality checks in this phase */}
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Quality Checks</Typography>
                          {qualityChecksForPhase(b).length ? (
                            qualityChecksForPhase(b).map((qc) => (
                              <Box key={qc._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ flex: 1, minWidth: 240 }}>{qc.title}</Typography>
                                {qc.accepted ? <Chip size="small" color="success" label="Completed" /> : null}
                                <Tooltip title={qc.accepted ? 'Reopen Check' : 'Mark Completed'}>
                                  <IconButton size="small" color={qc.accepted ? 'default' : 'primary'} onClick={() => toggleQualityCheck(b._id, qc)}>
                                    {qc.accepted ? <UndoIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No quality checks</Typography>
                          )}
                        </Box>
                        {/* Footer spacing */}
                        <Box sx={{ mt: 1 }} />
                      </Box>
                    }
                  />
                </ListItem>
                {idx < bidsForPhase.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        ) : <Typography variant="body2" color="text.secondary">No trades in this phase</Typography>}
      </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Dependency Graph</Typography>
            <DependencyGraph
              trades={bidsForPhase}
              allTrades={home.trades || []}
              phaseKey={currentPhase}
              height={380}
              onNodeClick={(node) => {
                try {
                  const trade = (home.trades || []).find((t) => String(t._id) === String(node.group))
                  const task = trade?.tasks?.find((tk) => String(tk._id) === String(node.id))
                  if (trade && task) {
                    openTask(trade._id, task)
                  }
                } catch {}
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Timeline</Typography>
            <PhaseTimeline
              schedules={(home.schedules || []).filter((s) => !s.taskId ? bidsForPhase.some(b => b._id === s.bidId) : true)}
              tasks={bidsForPhase.flatMap((b) => (b.tasks || []).filter((t) => (t.phaseKey || currentPhase) === currentPhase).map((t) => ({ ...t, bidId: b._id, tradeName: b.name })))}
              height={260}
            />
          </Paper>
        </>
      )}

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

      {/* Add Task/Quality Check Dialog */}
      <Dialog open={addDialog.open} onClose={() => setAddDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{addDialog.mode === 'task' ? 'Add Task' : 'Add Quality Check'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={addDialog.title}
              onChange={(e) => setAddDialog((d) => ({ ...d, title: e.target.value }))}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label={addDialog.mode === 'task' ? 'Description' : 'Notes'}
              value={addDialog.desc}
              onChange={(e) => setAddDialog((d) => ({ ...d, desc: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Phase"
              value={addDialog.phaseKey}
              onChange={(e) => setAddDialog((d) => ({ ...d, phaseKey: e.target.value }))}
              select
              fullWidth
            >
              {ALL_PHASES.map((p) => (<option key={p} value={p}>{p}</option>))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button onClick={submitAddDialog} variant="contained" disabled={!addDialog.title}>Add</Button>
        </DialogActions>
      </Dialog>

    </Stack>
  )
}


