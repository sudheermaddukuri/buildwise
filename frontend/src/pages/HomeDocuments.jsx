import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Tooltip from '@mui/material/Tooltip'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useNavigate } from 'react-router-dom'

export default function HomeDocuments() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [home, setHome] = useState(null)
  const [filter, setFilter] = useState('all') // legacy filter
  const [tab, setTab] = useState('all') // all | contract | bid | invoice | picture
  const [preview, setPreview] = useState({ open: false, url: '', title: '' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getHome(id).then(setHome).catch(() => {})
  }, [id])

  const docs = useMemo(() => {
    if (!home?.documents) return []
    let items = home.documents
    // Category tabs
    if (tab !== 'all') {
      if (tab === 'picture') {
        items = items.filter((d) => d.category === 'picture' || /\.(png|jpg|jpeg|webp|gif)$/i.test(d.url || ''))
      } else {
        items = items.filter((d) => (d.category || 'other') === tab)
      }
    }
    // Legacy dropdown filter still applies within tab
    if (filter === 'pdf') {
      items = items.filter((d) => (d.url || '').toLowerCase().endsWith('.pdf'))
    } else if (filter === 'photos') {
      items = items.filter((d) => /\.(png|jpg|jpeg|webp|gif)$/i.test(d.url || ''))
    }
    return items
  }, [home, filter])

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
  async function onDelete(docId) {
    if (!window.confirm('Delete this document from the project? This cannot be undone.')) return
    try {
      setBusy(true)
      const res = await api.deleteDocument(id, docId)
      setHome(res.home)
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Documents"
        onBack={() => navigate(-1)}
        breadcrumbs={[
          { label: 'Homes', href: '/homes' },
          { label: home?.name || 'Home', href: `/homes/${id}` },
          { label: 'Documents' }
        ]}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="contained" onClick={() => setUploadOpen(true)}>Upload</Button>
            <FormControl size="small">
              <InputLabel id="doc-filter">Filter</InputLabel>
              <Select labelId="doc-filter" label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pdf">PDFs</MenuItem>
                <MenuItem value="photos">Photos</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant={tab === 'all' ? 'contained' : 'outlined'} onClick={() => setTab('all')}>All</Button>
          <Button size="small" variant={tab === 'contract' ? 'contained' : 'outlined'} onClick={() => setTab('contract')}>Contracts</Button>
          <Button size="small" variant={tab === 'bid' ? 'contained' : 'outlined'} onClick={() => setTab('bid')}>Bids</Button>
          <Button size="small" variant={tab === 'invoice' ? 'contained' : 'outlined'} onClick={() => setTab('invoice')}>Invoices</Button>
          <Button size="small" variant={tab === 'picture' ? 'contained' : 'outlined'} onClick={() => setTab('picture')}>Pictures</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Pinned To</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Uploaded At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.map((d) => {
              const name = d.fileName || d.title || (d.url || '').split('/').pop() || 'File'
              const uploadedBy = d.uploadedBy?.fullName || d.uploadedBy?.email || ''
              const uploadedAt = d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
              return (
                <TableRow key={d._id}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>
                    <Button variant="text" onClick={() => openPreview(d.url, name)}>{name}</Button>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, wordBreak: 'break-all' }}>
                    {d.title && d.title !== name ? d.title : '—'}
                  </TableCell>
                  <TableCell>{d.category || (/\.(png|jpg|jpeg|webp|gif)$/i.test(d.url || '') ? 'picture' : 'other')}</TableCell>
                  <TableCell>{d.pinnedTo?.type || 'home'}</TableCell>
                  <TableCell>{uploadedBy || '—'}</TableCell>
                  <TableCell>{uploadedAt || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => openPreview(d.url, name)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton size="small" component={Link} href={d.url} download target="_blank" rel="noreferrer">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton size="small" color="error" disabled={busy} onClick={() => onDelete(d._id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
            {!docs.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">No documents</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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


