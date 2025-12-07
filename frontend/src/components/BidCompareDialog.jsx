import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { api } from '../api/client'

/**
 * BidCompareDialog
 * - Lets user select two or more PDF files to compare for a given trade
 * - Supports selecting from existing trade documents and uploading new PDFs
 * - Calls backend compare endpoint and displays results
 */
export default function BidCompareDialog({
  open,
  onClose,
  homeId,
  tradeId,
  existingDocs = [],
  onAfterUpload, // optional: callback(updatedHome) if we persist new docs
  defaultExtraContext = '',
}) {
  const [docs, setDocs] = useState([])
  const [selectedUrls, setSelectedUrls] = useState([])
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [result, setResult] = useState('')
  const [extraContext, setExtraContext] = useState('')

  useEffect(() => {
    if (open) {
      // Initialize from props each time dialog opens
      const pdfs = (existingDocs || []).filter((d) => /\.pdf($|[\?#])/i.test(d?.url || ''))
      setDocs(pdfs)
      setSelectedUrls([])
      setFiles([])
      setError('')
      setUploading(false)
      setComparing(false)
      setResult('')
      setExtraContext(defaultExtraContext || '')
    }
  }, [open, existingDocs, defaultExtraContext])

  const canCompare = useMemo(() => {
    const total = selectedUrls.length + files.length
    return total >= 2 && !uploading && !comparing
  }, [selectedUrls.length, files.length, uploading, comparing])

  function toggleSelect(url) {
    setSelectedUrls((arr) => (arr.includes(url) ? arr.filter((u) => u !== url) : [...arr, url]))
  }

  function onFilePicked(e) {
    setError('')
    const picked = Array.from(e.target.files || [])
    const nonPdf = picked.find((f) => !/application\/pdf/i.test(f.type) && !/\.pdf$/i.test(f.name || ''))
    if (nonPdf) {
      setError('Only PDF files are supported.')
      return
    }
    setFiles(picked)
  }

  async function uploadNewPdfs() {
    if (!files.length) return []
    setUploading(true)
    try {
      const uploadedUrls = []
      for (const f of files) {
        // Upload to file storage (S3 or equivalent)
        const up = await api.uploadTradeFile(homeId, tradeId, f, f.name)
        const fileUrl = up?.data?.fileUrl || up?.fileUrl || ''
        const fileName = up?.data?.fileName || up?.fileName || f.name
        if (!fileUrl) throw new Error('Upload succeeded but file URL missing')
        // Persist as project document and pin to trade so it appears later in lists
        const resDoc = await api.addDocument(homeId, {
          title: fileName,
          url: fileUrl,
          pinnedTo: { type: 'trade', id: tradeId }
        })
        // Add to available docs in the dialog
        const latestHome = resDoc?.home
        const newDoc = { title: fileName, url: fileUrl }
        setDocs((prev) => [{ ...newDoc }, ...prev])
        uploadedUrls.push(fileUrl)
        if (onAfterUpload && latestHome) onAfterUpload(latestHome)
      }
      // Clear the local file selection after successful upload
      setFiles([])
      // Auto-select uploaded files for comparison
      setSelectedUrls((arr) => [...uploadedUrls, ...arr])
      return uploadedUrls
    } finally {
      setUploading(false)
    }
  }

  async function onCompare() {
    setError('')
    setResult('')
    try {
      // Ensure any new files are uploaded and persisted first
      const newlyUploaded = await uploadNewPdfs()
      const urls = [...selectedUrls, ...newlyUploaded]
      const uniqueUrls = Array.from(new Set(urls)).filter(Boolean)
      if (uniqueUrls.length < 2) {
        setError('Select or upload at least two PDF files.')
        return
      }
      setComparing(true)
      const resp = await api.compareTradeBids(homeId, tradeId, { urls: uniqueUrls, extraContext })
      setResult(resp?.result || JSON.stringify(resp, null, 2))
    } catch (e) {
      setError(e.message)
    } finally {
      setComparing(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Compare Bids (PDFs)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Select two or more PDF bids for this trade to generate an apples-to-apples comparison. You can choose existing PDFs or upload new ones.
          </Typography>
          <Typography variant="subtitle2">Existing PDFs</Typography>
          <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
            {docs.map((d, idx) => (
              <div key={d.url || idx}>
                <ListItem
                  secondaryAction={<Checkbox edge="end" checked={selectedUrls.includes(d.url)} onChange={() => toggleSelect(d.url)} />}
                >
                  <ListItemText primary={d.title || d.url} secondary={d.url} />
                </ListItem>
                {idx < docs.length - 1 && <Divider component="li" />}
              </div>
            ))}
            {!docs.length && (
              <ListItem>
                <ListItemText primary="No PDFs uploaded for this trade yet." />
              </ListItem>
            )}
          </List>

          <Typography variant="subtitle2">Upload new PDFs</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
            <input type="file" accept="application/pdf" multiple onChange={onFilePicked} />
            <Button variant="outlined" disabled={!files.length || uploading} onClick={uploadNewPdfs}>
              {uploading ? 'Uploading…' : `Upload ${files.length ? `(${files.length})` : ''}`}
            </Button>
          </Stack>
          {!!files.length && (
            <Typography variant="caption" color="text.secondary">
              Pending upload: {files.map((f) => f.name).join(', ')}
            </Typography>
          )}

          <TextField
            label="Optional project/vendor context (shared with AI)"
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Comparison Result</Typography>
              <div style={{ border: '1px solid var(--mui-palette-divider)', padding: 12, borderRadius: 4, maxHeight: 320, overflow: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{result}</pre>
              </div>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading || comparing}>Close</Button>
        <Button variant="contained" onClick={onCompare} disabled={!canCompare}>
          {comparing ? <CircularProgress size={20} /> : 'Compare'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}


