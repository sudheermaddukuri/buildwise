import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import AddIcon from '@mui/icons-material/Add'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'

export default function HomeList() {
  const [homes, setHomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function computeProgress(home) {
    try {
      const trades = Array.isArray(home?.trades) ? home.trades : []
      const tasks = trades.flatMap((t) => Array.isArray(t?.tasks) ? t.tasks : [])
      const total = tasks.length
      const done = tasks.filter((t) => t && t.status === 'done').length
      const pct = total ? Math.round((done / total) * 100) : 0
      return { total, done, pct, tradesCount: trades.length }
    } catch {
      return { total: 0, done: 0, pct: 0, tradesCount: 0 }
    }
  }

  useEffect(() => {
    let mounted = true
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
        return
      }
    } catch {}
    api.listMyHomes()
      .then((data) => { if (mounted) { setHomes(data) } })
      .catch((e) => { if (mounted) { setError(e.message) } })
      .finally(() => { if (mounted) { setLoading(false) } })
    return () => { mounted = false }
  }, [])

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Homes</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/onboarding')}>
              <CardContent sx={{ display: 'grid', placeItems: 'center', minHeight: 120, textAlign: 'center' }}>
                <AddIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="subtitle1">Onboard New Home</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        {loading ? (
          <Grid item xs={12}>
            <Typography variant="body2">Loading…</Typography>
          </Grid>
        ) : (
          homes.map((h) => (
            <Grid key={h._id} item xs={12} sm={6} md={4} lg={3}>
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate(`/homes/${h._id}/preconstruction`)}>
                  <CardContent sx={{ display: 'grid', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{h.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{h.address || 'No address'}</Typography>
                    {(() => {
                      const prog = computeProgress(h)
                      return (
                        <>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LinearProgress variant="determinate" value={prog.pct} sx={{ flex: 1 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56, textAlign: 'right' }}>{prog.pct}%</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip size="small" label={`${prog.done}/${prog.total} tasks`} />
                            <Chip size="small" label={`${prog.tradesCount} trades`} />
                          </Stack>
                        </>
                      )
                    })()}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Stack>
  )
}


