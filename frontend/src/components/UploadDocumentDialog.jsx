import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'

/**
 * Reusable dialog to upload a document to S3 and persist in home documents.
 * Props:
 * - open, onClose
 * - homeId: string
 * - trades: array of trades (with tasks inside)
 * - defaultPinnedType: 'home' | 'trade' | 'task'
 * - defaultTradeId?: string
 * - defaultTaskId?: string
 * - onCompleted?: (updatedHome) => void
 */
export default function UploadDocumentDialog({
  open,
  onClose,
  homeId,
  trades = [],
  defaultPinnedType = 'home',
  defaultTradeId = '',
  defaultTaskId = '',
  onCompleted
}) {
  const [pinnedType, setPinnedType] = useState(defaultPinnedType)
  const [tradeId, setTradeId] = useState(defaultTradeId)
  const [taskId, setTaskId] = useState(defaultTaskId)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPinnedType(defaultPinnedType || 'home')
      setTradeId(defaultTradeId || '')
      setTaskId(defaultTaskId || '')
      setTitle('')
      setFile(null)
      setError('')
      setSubmitting(false)
    }
  }, [open, defaultPinnedType, defaultTradeId, defaultTaskId])

  const allTasks = useMemo(() => {
    return (trades || []).flatMap((t) => (t.tasks || []).map((task) => ({ ...task, tradeId: t._id, tradeName: t.name })))
  }, [trades])

  async function onSubmit() {
    setError('')
    if (!file) {
      setError('Please select a file to upload.')
      return
    }
    try {
      setSubmitting(true)
      let uploaded
      if (pinnedType === 'task') {
        const effectiveTaskId = taskId || ''
        if (!effectiveTaskId) throw new Error('Please select a Task')
        uploaded = await api.uploadTaskFile(homeId, effectiveTaskId, file, title || file.name)
      } else if (pinnedType === 'trade') {
        const effectiveTradeId = tradeId || ''
        if (!effectiveTradeId) throw new Error('Please select a Trade')
        uploaded = await api.uploadTradeFile(homeId, effectiveTradeId, file, title || file.name)
      } else {
        uploaded = await api.uploadHomeFile(homeId, file, title || file.name)
      }
      const fileUrl = uploaded?.data?.fileUrl || uploaded?.fileUrl || ''
      const fileName = uploaded?.data?.fileName || uploaded?.fileName || (title || file?.name)
      if (!fileUrl) throw new Error('Upload succeeded but file URL missing')
      const pinnedTo = pinnedType === 'home'
        ? { type: 'home' }
        : pinnedType === 'trade'
          ? { type: 'trade', id: tradeId }
          : { type: 'task', id: taskId }
      const resDoc = await api.addDocument(homeId, {
        title: fileName,
        url: fileUrl,
        pinnedTo
      })
      if (onCompleted) onCompleted(resDoc.home)
      onClose?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload Document</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="pin-type">Pin To</InputLabel>
            <Select
              labelId="pin-type"
              label="Pin To"
              value={pinnedType}
              onChange={(e) => setPinnedType(e.target.value)}
            >
              <MenuItem value="home">Home</MenuItem>
              <MenuItem value="trade">Trade</MenuItem>
              <MenuItem value="task">Task</MenuItem>
            </Select>
          </FormControl>
          {pinnedType === 'trade' && (
            <FormControl fullWidth>
              <InputLabel id="trade-id">Select Trade</InputLabel>
              <Select
                labelId="trade-id"
                label="Select Trade"
                value={tradeId}
                onChange={(e) => setTradeId(e.target.value)}
              >
                {(trades || []).map((t) => (
                  <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {pinnedType === 'task' && (
            <FormControl fullWidth>
              <InputLabel id="task-id">Select Task</InputLabel>
              <Select
                labelId="task-id"
                label="Select Task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                {allTasks.map((t) => (
                  <MenuItem key={t._id} value={t._id}>{`${t.tradeName} — ${t.title}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <div>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Select File</Typography>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting || !file}>Upload</Button>
      </DialogActions>
    </Dialog>
  )
}


