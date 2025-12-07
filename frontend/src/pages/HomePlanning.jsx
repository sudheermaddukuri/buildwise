import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PageHeader from '../components/PageHeader.jsx'
import UploadDocumentDialog from '../components/UploadDocumentDialog.jsx'
import Link from '@mui/material/Link'

export default function HomePlanning() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [home, setHome] = useState(null)
  const [preview, setPreview] = useState({ open: false, url: '', title: '' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadForCategory, setUploadForCategory] = useState('architecture_base')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getHome(id).then(setHome).catch(() => {})
  }, [id])

  function openPreview(url, title) {
    window.open(url, '_blank', 'noopener,noreferrer')
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

  const byCategory = useMemo(() => {
    const items = Array.isArray(home?.documents) ? home.documents : []
    const pick = (cat) => items.filter((d) => (d.category || '') === cat)
      .sort((a, b) => (Number(b.version || 0) - Number(a.version || 0)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))
    return {
      architecture_base: pick('architecture_base'),
      architecture_structural: pick('architecture_structural'),
      architecture_foundation: pick('architecture_foundation'),
      architecture_mep: pick('architecture_mep'),
      permit: items.filter((d) => (d.category || '') === 'permit')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }
  }, [home])

  function Section({ title, catKey, optional }) {
    const items = byCategory[catKey] || []
    const finalItem = items.find((d) => d.isFinal)
    return (
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', pt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title} {!optional && !items.length ? <span style={{ color: '#ff7961', fontWeight: 400, fontSize: 12 }}>(required)</span> : null}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => { setUploadForCategory(catKey); setUploadOpen(true) }}>
            {items.length ? 'Upload New Version' : 'Upload'}
          </Button>
        </Box>
        {finalItem && (
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Final: v{finalItem.version || '—'} — {finalItem.title || finalItem.fileName || 'Document'}
          </Typography>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Final</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((d) => {
              const name = d.fileName || d.title || (d.url || '').split('/').pop() || 'File'
              const uploadedAt = d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
              const isFinal = !!d.isFinal
              return (
                <TableRow key={d._id}>
                  <TableCell>{d.version || '—'}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{d.title || name}</TableCell>
                  <TableCell>{uploadedAt || '—'}</TableCell>
                  <TableCell>{isFinal ? 'Yes' : 'No'}</TableCell>
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
                    {!isFinal && ['architecture_base','architecture_structural','architecture_foundation','architecture_mep'].includes(catKey) && (
                      <Tooltip title="Mark as Final">
                        <span>
                          <IconButton
                            size="small"
                            disabled={busy}
                            onClick={async () => {
                              try {
                                setBusy(true)
                                const updated = await api.updateDocument(id, d._id, { isFinal: true })
                                setHome(updated)
                              } catch {}
                              finally { setBusy(false) }
                            }}
                          >
                            ✓
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
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
            {!items.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No documents</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Planning"
        onBack={() => navigate(-1)}
        breadcrumbs={[
          { label: 'Homes', href: '/homes' },
          { label: home?.name || 'Home', href: `/homes/${id}` },
          { label: 'Planning' }
        ]}
        actions={
          <Button variant="contained" onClick={() => { setUploadForCategory('architecture_base'); setUploadOpen(true) }}>Upload</Button>
        }
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Architecture</Typography>
        <Stack spacing={2}>
          <Section title="Base Architecture" catKey="architecture_base" optional={false} />
          <Section title="Structural (optional)" catKey="architecture_structural" optional />
          <Section title="Foundation Letter (optional)" catKey="architecture_foundation" optional />
          <Section title="MEP Planning (optional)" catKey="architecture_mep" optional />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Permits</Typography>
        <Section title="City Permits" catKey="permit" optional />
      </Paper>
      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        homeId={id}
        trades={home?.trades || home?.bids || []}
        defaultPinnedType="home"
        defaultDocType={uploadForCategory}
        onCompleted={(updatedHome) => setHome(updatedHome)}
      />
    </Stack>
  )
}


