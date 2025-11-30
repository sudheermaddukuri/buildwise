import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'

export default function HomeDocuments() {
  const { id } = useParams()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [pinType, setPinType] = useState('home')
  const [pinId, setPinId] = useState('')
  const [preview, setPreview] = useState({ open: false, url: '', title: '' })
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    api.getHome(id).then(setHome).catch((e) => setError(e.message))
  }, [id])

  const docs = useMemo(() => {
    if (!home?.documents) return []
    let items = home.documents
    if (filter === 'pdf') {
      items = items.filter((d) => (d.url || '').toLowerCase().endsWith('.pdf'))
    } else if (filter === 'photos') {
      items = items.filter((d) => /\.(png|jpg|jpeg|webp|gif)$/i.test(d.url || ''))
    }
    return items
  }, [home, filter])

  async function addDoc(e) {
    e.preventDefault()
    setError('')
    try {
      const body = {
        title,
        url,
        pinnedTo: { type: pinType, id: pinType === 'home' ? undefined : pinId },
      }
      const res = await api.addDocument(id, body)
      setHome(res.home)
      setTitle('')
      setUrl('')
      setPinType('home')
      setPinId('')
    } catch (e2) {
      setError(e2.message)
    }
  }

  async function openPreview(url, title) {
    // For PDFs, try to fetch and display via blob URL to bypass attachment headers
    if (isPdf(url)) {
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
  function isImage(u) {
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(u || '')
  }
  function isPdf(u) {
    return /\.pdf($|[\?#])/i.test(u || '')
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Add Document (by URL)</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button variant="contained" onClick={() => setUploadOpen(true)}>Upload Document</Button>
        </Stack>
        <Stack component="form" spacing={2} onSubmit={addDoc}>
          <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="URL" required value={url} onChange={(e) => setUrl(e.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="pin-type">Pin To</InputLabel>
              <Select labelId="pin-type" label="Pin To" value={pinType} onChange={(e) => setPinType(e.target.value)}>
                <MenuItem value="home">Home</MenuItem>
                <MenuItem value="trade">Trade</MenuItem>
                <MenuItem value="task">Task</MenuItem>
              </Select>
            </FormControl>
            {pinType !== 'home' && (
              <FormControl fullWidth>
                <InputLabel id="pin-id">Select {pinType}</InputLabel>
                <Select
                  labelId="pin-id"
                  label={`Select ${pinType}`}
                  value={pinId}
                  onChange={(e) => setPinId(e.target.value)}
                >
                  {pinType === 'trade' &&
                    ((home?.trades || home?.bids || [])).map((b) => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                  {pinType === 'task' &&
                    ((home?.trades || home?.bids || [])).flatMap((b) =>
                      (b.tasks || []).map((t) => (
                        <MenuItem key={t._id} value={t._id}>{`${b.name} — ${t.title}`}</MenuItem>
                      ))
                    )}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Button variant="contained" type="submit">Add</Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Documents</Typography>
          <FormControl size="small">
            <InputLabel id="doc-filter">Filter</InputLabel>
            <Select labelId="doc-filter" label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pdf">PDFs</MenuItem>
              <MenuItem value="photos">Photos</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Grid container spacing={2}>
          {docs.map((d) => {
            const name = d.fileName || d.title || (d.url || '').split('/').pop() || 'File'
            const uploadedBy = d.uploadedBy?.fullName || d.uploadedBy?.email || ''
            const uploadedAt = d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
            return (
              <Grid item xs={12} sm={6} md={4} key={d._id}>
                <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {d.title && d.title !== name ? d.title : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {uploadedBy ? `Uploaded by: ${uploadedBy}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {uploadedAt ? `Uploaded: ${uploadedAt}` : ''}
                  </Typography>
                  <Chip size="small" label={`Pinned: ${d.pinnedTo?.type || 'home'}`} sx={{ width: 'fit-content' }} />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => openPreview(d.url, name)}>View</Button>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      href={d.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            )
          })}
          {!docs.length && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">No documents</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

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
      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        homeId={id}
        trades={home?.trades || home?.bids || []}
        defaultPinnedType="home"
        onCompleted={(updatedHome) => setHome(updatedHome)}
      />
    </Stack>
  )
}


