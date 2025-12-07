import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'

const steps = ['Home Details', 'Architecture & Template', 'Invites']

export default function Onboarding() {
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // People (legacy selection, kept for potential autocomplete suggestions)
  const [people, setPeople] = useState([])

  // Home
  const [home, setHome] = useState({ name: '', address: '', withTemplates: true, templateId: '' })
  const [templates, setTemplates] = useState([])
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [selectedVersionId, setSelectedVersionId] = useState('')
  // Architecture step
  const [archFile, setArchFile] = useState(null)
  const [archUpload, setArchUpload] = useState({ url: '', fileName: '' })
  const [houseType, setHouseType] = useState('')
  const [roofType, setRoofType] = useState('')
  const [exteriorType, setExteriorType] = useState('')
  const [hasArchitecture, setHasArchitecture] = useState('unknown') // 'yes' | 'no' | 'unknown'
  const [archDialogOpen, setArchDialogOpen] = useState(false)
  const [archBusy, setArchBusy] = useState(false)
  const [archError, setArchError] = useState('')
  // Invites step
  const [invites, setInvites] = useState([{ email: '', role: 'partner' }])

  useEffect(() => {
    api.listPeople().then(setPeople).catch(() => {})
    api.listTemplates()
      .then((ts) => {
        const list = ts || []
        setTemplates(list)
      })
      .catch(() => {})
  }, [])

  function groupByTemplateKey(list) {
    const map = {}
    for (const t of list) {
      const key = t.templateKey || 'unknown'
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }

  function sortVersionsDesc(items) {
    return [...(items || [])].sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
  }

  const isHomeStepValid = useMemo(() => Boolean(home.name), [home])
  const isArchStepValid = useMemo(() => Boolean(home.templateId), [home.templateId])
  const isInvitesStepValid = useMemo(() => {
    // At least one invite or allow empty
    return invites.every((i) => !i.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email))
  }, [invites])

  function removeMonitor(email) {
    setSelectedMonitors(selectedMonitors.filter((m) => m.email !== email))
  }

  async function uploadArchitectureTemp() {
    if (!archFile) return { url: '', fileName: '' }
    const form = new FormData()
    form.append('title', archFile.name)
    form.append('file', archFile)
    form.append('folderName', `homes/onboarding/${Date.now()}`)
    const res = await fetch(`${import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:5051/api')}/file-storage/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: form
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `Upload failed`)
    }
    const data = await res.json()
    return { url: data?.data?.fileUrl || '', fileName: data?.data?.fileName || archFile.name }
  }

  function suggestFromFileName(name) {
    const n = (name || '').toLowerCase()
    let ht = ''
    if (n.includes('townhome') || n.includes('town-home')) ht = 'townhome'
    else if (n.includes('pool')) ht = 'pool'
    else if (n.includes('hangar') || n.includes('aircraft')) ht = 'airport_hangar'
    else ht = 'single_family'
    let rt = ''
    if (n.includes('metal')) rt = 'metal_roof'
    else if (n.includes('tile') || n.includes('concrete')) rt = 'concrete_tile'
    else if (n.includes('flat')) rt = 'flat_roof'
    else if (n.includes('shingle') || n.includes('asphalt')) rt = 'shingles'
    const et = n.includes('brick') ? 'brick' : n.includes('stucco') ? 'stucco' : ''
    return { ht, rt, et }
  }

  function parseDetection(jsonText) {
    try {
      const obj = JSON.parse(jsonText)
      return {
        houseType: String(obj.houseType || '').trim(),
        roofType: String(obj.roofType || '').trim(),
        exteriorType: String(obj.exteriorType || '').trim(),
      }
    } catch {
      try {
        // Handle code-fenced JSON blocks like ```json ... ```
        const raw = String(jsonText || '')
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        const inner = fence ? fence[1] : raw
        // Fallback: extract the first {...} block
        let candidate = inner
        if (!fence) {
          const start = inner.indexOf('{')
          const end = inner.lastIndexOf('}')
          if (start !== -1 && end !== -1 && end > start) {
            candidate = inner.slice(start, end + 1)
          }
        }
        const obj2 = JSON.parse(candidate)
        return {
          houseType: String(obj2.houseType || '').trim(),
          roofType: String(obj2.roofType || '').trim(),
          exteriorType: String(obj2.exteriorType || '').trim(),
        }
      } catch {
        return { houseType: '', roofType: '', exteriorType: '' }
      }
    }
  }

  function normalizeRoofType(v) {
    const s = String(v || '').toLowerCase().replace(/\s+/g, '_')
    if (!s) return ''
    if (s.includes('metal')) return 'metal_roof'
    if (s.includes('tile') || s.includes('concrete')) return 'concrete_tile'
    if (s.includes('flat')) return 'flat_roof'
    if (s.includes('shingle') || s.includes('asphalt')) return 'shingles'
    return 'other'
  }

  function templateKeyForHouseType(ht) {
    if (ht === 'townhome') return 'townhome'
    if (ht === 'pool') return 'pool'
    if (ht === 'airport_hangar') return 'airport_hangar'
    return 'single_family'
  }

  const filteredTemplates = useMemo(() => {
    const key = templateKeyForHouseType(houseType || '')
    const byKey = groupByTemplateKey(templates)
    return byKey[key] || []
  }, [templates, houseType])

  async function handleSubmit() {
    setError('')
    try {
      let arch = archUpload
      if (archFile && !arch.url) {
        arch = await uploadArchitectureTemp()
        setArchUpload(arch)
      }
      const participants = invites.filter((i) => i.email).map((i) => ({
        email: i.email,
        fullName: (people.find((p) => p.email === i.email)?.fullName) || i.email,
        role: i.role,
      }))
      const payload = { participants, home }
      const res = await api.onboardingCreate(payload)
      const created = res.home || res
      if (created && created._id) {
        // Attach architecture doc if uploaded
        if (arch.url) {
          try {
            await api.addDocument(created._id, { title: arch.fileName || 'Architecture', url: arch.url, category: 'architecture_base', isFinal: true, pinnedTo: { type: 'home' } })
          } catch {}
        }
        try { localStorage.setItem('lastHomeId', created._id) } catch {}
        navigate(`/homes/${created._id}`)
      } else {
        throw new Error('Unexpected response')
      }
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Stack spacing={2}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField label="Home Name" required value={home.name} onChange={(e) => setHome({ ...home, name: e.target.value })} />
            <TextField label="Home Address" value={home.address} onChange={(e) => setHome({ ...home, address: e.target.value })} />
          </Stack>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>Do you have architecture diagrams ready?</Typography>
              <RadioGroup
                row
                value={hasArchitecture}
                onChange={(e) => {
                  const v = e.target.value
                  setHasArchitecture(v)
                  if (v === 'yes') setArchDialogOpen(true)
                }}
              >
                <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="no" control={<Radio />} label="No" />
              </RadioGroup>
              {hasArchitecture !== 'yes' && (
                <Typography variant="body2" color="text.secondary">If you don’t have diagrams yet, select House/Roof/Exterior types below.</Typography>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="house-type">House Type</InputLabel>
                  <Select labelId="house-type" label="House Type" value={houseType} onChange={(e) => setHouseType(e.target.value)}>
                    <MenuItem value="single_family">Single Family</MenuItem>
                    <MenuItem value="townhome">Townhome</MenuItem>
                    <MenuItem value="pool">Pool</MenuItem>
                    <MenuItem value="airport_hangar">Airport Hangar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="roof-type">Roof Type</InputLabel>
                  <Select labelId="roof-type" label="Roof Type" value={roofType} onChange={(e) => setRoofType(e.target.value)}>
                    <MenuItem value="shingles">Shingles</MenuItem>
                    <MenuItem value="concrete_tile">Concrete Tile</MenuItem>
                    <MenuItem value="flat_roof">Flat Roof</MenuItem>
                    <MenuItem value="metal_roof">Metal Roof</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="exterior-type">Exterior Type</InputLabel>
                  <Select labelId="exterior-type" label="Exterior Type" value={exteriorType} onChange={(e) => setExteriorType(e.target.value)}>
                    <MenuItem value="brick">Brick</MenuItem>
                    <MenuItem value="stucco">Stucco</MenuItem>
                    <MenuItem value="siding">Siding</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle1" gutterBottom>Select Template</Typography>
              <Grid container spacing={2}>
                {Object.entries(groupByTemplateKey(filteredTemplates.length ? filteredTemplates : templates)).map(([key, items]) => {
                  const latest = sortVersionsDesc(items)[0]
                  return (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Card variant={selectedTemplateKey === key ? 'outlined' : 'elevation'} sx={{ borderColor: selectedTemplateKey === key ? 'primary.main' : undefined }}>
                        <CardActionArea onClick={() => {
                          setSelectedTemplateKey(key)
                          const versions = sortVersionsDesc(items)
                          const v = versions[0]
                          setSelectedVersionId(v?._id || '')
                          setHome((h) => ({ ...h, templateId: v?._id || '' }))
                        }}>
                          <CardContent>
                            <Typography variant="subtitle1">{latest?.name || key}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>{latest?.description || ''}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip label={`Key: ${key}`} size="small" />
                              {latest?.version ? <Chip label={`Latest v${latest.version}`} size="small" /> : null}
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>

            {selectedTemplateKey && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>Select Version</Typography>
                <Grid container spacing={2}>
                  {sortVersionsDesc((groupByTemplateKey(templates)[selectedTemplateKey] || [])).map((v) => (
                    <Grid item xs={12} sm={6} md={4} key={v._id}>
                      <Card variant={selectedVersionId === v._id ? 'outlined' : 'elevation'} sx={{ borderColor: selectedVersionId === v._id ? 'primary.main' : undefined }}>
                        <CardActionArea onClick={() => {
                          setSelectedVersionId(v._id)
                          setHome((h) => ({ ...h, templateId: v._id }))
                        }}>
                          <CardContent>
                            <Typography variant="subtitle2">{v.name}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip label={`v${v.version}`} size="small" />
                              <Chip label={v.status} size="small" color={v.status === 'frozen' ? 'warning' : 'default'} />
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Architecture Upload + Analyze Dialog */}
      <Dialog open={archDialogOpen} onClose={() => (!archBusy ? setArchDialogOpen(false) : null)} fullWidth maxWidth="sm">
        <DialogTitle>Upload Architecture</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Upload PDF or images of the drawings. We’ll analyze them to suggest House, Roof, and Exterior types.</Typography>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setArchFile(e.target.files?.[0] || null)} />
            {archError && <Alert severity="error">{archError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchDialogOpen(false)} disabled={archBusy}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!archFile || archBusy}
            onClick={async () => {
              setArchError('')
              try {
                setArchBusy(true)
                const uploaded = await uploadArchitectureTemp()
                setArchUpload(uploaded)
                // Analyze via AI (PDF extract + image support)
                const prompt = [
                  'Extract home characteristics from the provided architectural drawings/blueprints or images.',
                  'Return a STRICT JSON object with keys:',
                  'houseType (one of: single_family, townhome, pool, airport_hangar or empty),',
                  'roofType (one of: shingles, concrete_tile, flat_roof, metal_roof, other or empty),',
                  'exteriorType (one of: brick, stucco, siding, other or empty).',
                  'If unsure, use empty string. No extra text.'
                ].join(' ')
                const res = await api.analyzeArchitecture({ urls: [uploaded.url] })
                const detected = {
                  houseType: res?.houseType || '',
                  roofType: res?.roofType || '',
                  exteriorType: res?.exteriorType || ''
                }
                // Fallback to filename heuristic if empty
                if (!detected.houseType && archFile?.name) {
                  const s = suggestFromFileName(archFile.name)
                  if (!detected.houseType) detected.houseType = s.ht
                  if (!detected.roofType) detected.roofType = s.rt
                  if (!detected.exteriorType) detected.exteriorType = s.et
                }
                if (detected.houseType) setHouseType(detected.houseType)
                if (detected.roofType) setRoofType(detected.roofType)
                if (detected.exteriorType) setExteriorType(detected.exteriorType)
                setArchDialogOpen(false)
              } catch (e) {
                setArchError(e.message || 'Analysis failed')
              } finally {
                setArchBusy(false)
              }
            }}
          >
            {archBusy ? <CircularProgress size={18} /> : 'Upload & Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Invite people to this home</Typography>
            {invites.map((row, idx) => (
              <Grid container spacing={1} alignItems="center" key={idx}>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth label="Email" value={row.email} onChange={(e) => {
                    const next = [...invites]; next[idx] = { ...next[idx], email: e.target.value }; setInvites(next)
                  }} />
                </Grid>
                <Grid item xs={10} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel id={`role-${idx}`}>Role</InputLabel>
                    <Select labelId={`role-${idx}`} label="Role" value={row.role} onChange={(e) => {
                      const next = [...invites]; next[idx] = { ...next[idx], role: e.target.value }; setInvites(next)
                    }}>
                      <MenuItem value="partner">Partner</MenuItem>
                      <MenuItem value="builder">Builder</MenuItem>
                      <MenuItem value="coordinator">Coordinator</MenuItem>
                      <MenuItem value="builder advisor">Builder Advisor</MenuItem>
                      <MenuItem value="architect">Architect</MenuItem>
                      <MenuItem value="interior decorator">Interior Decorator</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2} sm={1}>
                  <IconButton onClick={() => setInvites((list) => list.length > 1 ? list.filter((_, i) => i !== idx) : list)} aria-label="remove">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Box>
              <Button startIcon={<AddIcon />} onClick={() => setInvites((list) => [...list, { email: '', role: 'partner' }])}>Add Invite</Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep((s) => s + 1)}
            disabled={
              (activeStep === 0 && !isHomeStepValid) ||
              (activeStep === 1 && !isArchStepValid) ||
              (activeStep === 2 && !isInvitesStepValid)
            }
          >
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={!isHomeStepValid || !isArchStepValid || !isInvitesStepValid}>Create Home</Button>
        )}
      </Stack>
    </Stack>
  )
}


