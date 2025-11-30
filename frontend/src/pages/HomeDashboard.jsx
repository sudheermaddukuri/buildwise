import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import * as d3 from 'd3'

const ALL_PHASES = ['preconstruction', 'exterior', 'interior']
const PHASE_LABELS = {
  preconstruction: 'PreConstruction',
  exterior: 'Exterior Build',
  interior: 'Interior / Finish Out'
}
const PHASE_COLORS = {
  preconstruction: '#1976d2',
  exterior: '#ef6c00',
  interior: '#2e7d32'
}

function ProgressDonutByPhase({ data, size = 240 }) {
  const ref = useRef(null)
  const margin = 8
  const outerRadius = (size / 2) - margin
  const outerInnerRadius = outerRadius - 22
  const innerOuterRadius = outerInnerRadius - 8
  const innerInnerRadius = innerOuterRadius - 18

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // clear
    while (el.firstChild) el.removeChild(el.firstChild)
    const svg = d3.select(el)
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`)

    const totals = data.map(d => Math.max(0, Number(d.total) || 0))
    const dones = data.map(d => Math.max(0, Number(d.done) || 0))
    const anyTotals = totals.reduce((s, v) => s + v, 0) > 0
    // Safeguard: if no tasks at all, render equal thirds with zero done
    const valuesForTotals = anyTotals ? totals : data.map(() => 1)

    const pieGen = d3.pie().sort(null)
    const arcsTotals = pieGen(valuesForTotals)
    const arcsDone = pieGen(dones)

    const arcOuter = d3.arc().innerRadius(outerInnerRadius).outerRadius(outerRadius)
    const arcInner = d3.arc().innerRadius(innerInnerRadius).outerRadius(innerOuterRadius)

    // Outer ring (totals) - lighter tints
    svg.selectAll('path.total')
      .data(arcsTotals)
      .enter()
      .append('path')
      .attr('class', 'total')
      .attr('d', arcOuter)
      .attr('fill', (_, i) => {
        const key = data[i].phase
        const c = d3.color(PHASE_COLORS[key] || '#90a4ae') || d3.color('#90a4ae')
        return c.brighter(1.2).formatHex()
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 1)

    // Inner ring (done) - darker colors, but clamp to arc length if done > total
    svg.selectAll('path.done')
      .data(arcsDone)
      .enter()
      .append('path')
      .attr('class', 'done')
      .attr('d', (d, i) => {
        // Prevent over-drawing if done exceeds total (shouldn't happen, but defensive)
        const totalArc = arcsTotals[i]
        const endAngle = Math.min(d.endAngle, totalArc.endAngle)
        const dd = { ...d, endAngle }
        return arcInner(dd)
      })
      .attr('fill', (_, i) => PHASE_COLORS[data[i].phase] || '#607d8b')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)

    // Center label: overall percent complete
    const sumTotal = totals.reduce((s, v) => s + v, 0)
    const sumDone = dones.reduce((s, v) => s + v, 0)
    const pct = sumTotal ? Math.round((sumDone / sumTotal) * 100) : 0
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', '24px')
      .style('font-weight', 600)
      .text(`${pct}%`)
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', '12px')
      .style('fill', '#607d8b')
      .text('Overall Complete')
  }, [data, size, outerRadius, outerInnerRadius, innerOuterRadius, innerInnerRadius])

  return <div ref={ref} />
}

export default function HomeDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [home, setHome] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    api.getHome(id)
      .then((h) => { if (mounted) setHome(h) })
      .catch((e) => { if (mounted) setError(e.message) })
    return () => { mounted = false }
  }, [id])

  const trades = home?.trades || []
  const schedules = home?.schedules || []

  const phaseTaskStats = useMemo(() => {
    function tasksForPhase(trade, phase) {
      const tasks = Array.isArray(trade?.tasks) ? trade.tasks : []
      return tasks.filter((t) => {
        if (!t) return false
        if (t.phaseKey) return t.phaseKey === phase
        return (trade.phaseKeys || []).includes(phase)
      })
    }
    return ALL_PHASES.map((phase) => {
      const allTasks = trades.flatMap((t) => tasksForPhase(t, phase))
      const total = allTasks.length
      const done = allTasks.filter((t) => t.status === 'done').length
      const pct = total ? Math.round((done / total) * 100) : 0
      return { phase, total, done, pct }
    })
  }, [trades])

  const currentPhase = useMemo(() => {
    const firstIncomplete = phaseTaskStats.find((p) => p.total > 0 && p.done < p.total)
    if (firstIncomplete) return firstIncomplete.phase
    // if no tasks at all, default to preconstruction; if all complete, show last phase
    const anyTasks = phaseTaskStats.some((p) => p.total > 0)
    return anyTasks ? 'interior' : 'preconstruction'
  }, [phaseTaskStats])

  const nextSchedule = useMemo(() => {
    const now = Date.now()
    const items = (schedules || []).filter((s) => s && s.startsAt && new Date(s.startsAt).getTime() > now)
    items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    return items[0] || null
  }, [schedules])

  const actionsRequired = useMemo(() => {
    const tasks = trades.flatMap((trade) => (trade.tasks || []).map((t) => ({ trade, task: t })))
    const actionable = tasks.filter(({ task }) => task && (task.status === 'todo' || task.status === 'blocked'))
    actionable.sort((a, b) => {
      const ad = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity
      const bd = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity
      return ad - bd
    })
    return actionable.slice(0, 5)
  }, [trades])

  const budgetSummary = useMemo(() => {
    const totalBudget = trades.reduce((s, t) => s + (Number(t.totalPrice) || 0), 0)
    const totalPaid = trades.reduce((s, t) => s + (t.invoices || []).filter(i => i.paid).reduce((x, i) => x + (Number(i.amount) || 0), 0), 0)
    const totalInvoiced = trades.reduce((s, t) => s + (t.invoices || []).reduce((x, i) => x + (Number(i.amount) || 0), 0), 0)
    const totalExtras = trades.reduce((s, t) => s + (t.additionalCosts || []).reduce((x, c) => x + (Number(c.amount) || 0), 0), 0)
    const totalOutstanding = Math.max(totalBudget - totalPaid, 0)
    const totalVariance = (totalInvoiced + totalExtras) - totalBudget
    return { totalBudget, totalPaid, totalInvoiced, totalExtras, totalOutstanding, totalVariance }
  }, [trades])

  const progressData = useMemo(() => {
    return phaseTaskStats.map(p => ({ phase: p.phase, total: p.total, done: p.done }))
  }, [phaseTaskStats])

  const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleString() } catch { return String(d || '') }
  }

  if (!home) {
    return <Typography variant="body2">Loading… {error && <Box component="span" sx={{ color: 'error.main' }}>{error}</Box>}</Typography>
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Overview</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Current Phase</Typography>
            <Typography variant="h6">{PHASE_LABELS[currentPhase]}</Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/homes/${id}/${currentPhase}`)}>View phase</Button>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Scheduled Next</Typography>
            {nextSchedule ? (
              <>
                <Typography variant="subtitle2">{nextSchedule.title}</Typography>
                <Typography variant="body2" color="text.secondary">{fmtDate(nextSchedule.startsAt)}</Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/homes/${id}/schedule`)}>Open schedule</Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No upcoming items</Typography>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Actions Needed</Typography>
            <Typography variant="h6">{actionsRequired.length}</Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/homes/${id}/trades`)}>View tasks</Button>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Construction Progress</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' }, alignItems: 'center', gap: 2 }}>
          <Box sx={{ justifySelf: 'center' }}>
            <ProgressDonutByPhase data={progressData} size={240} />
          </Box>
          <Box>
            <List dense disablePadding>
              {phaseTaskStats.map((p, idx) => {
                const color = PHASE_COLORS[p.phase]
                const light = d3.color(color)?.brighter(1.2)?.formatHex() || '#90a4ae'
                return (
                  <div key={p.phase}>
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText
                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ display: 'inline-block', width: 12, height: 12, background: light, borderRadius: 2, border: '1px solid #fff' }} />
                          <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2, border: '1px solid #fff' }} />
                          <span>{PHASE_LABELS[p.phase]}</span>
                        </Box>}
                        secondary={`${p.done}/${p.total} (${p.pct}%)`}
                      />
                    </ListItem>
                    {idx < phaseTaskStats.length - 1 && <Divider component="li" />}
                  </div>
                )
              })}
            </List>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Actions Required</Typography>
        <List dense disablePadding>
          {actionsRequired.map(({ trade, task }, idx) => {
            const secondary = []
            if (task.phaseKey) secondary.push(PHASE_LABELS[task.phaseKey] || task.phaseKey)
            if (task.dueDate) secondary.push(`Due ${fmtDate(task.dueDate)}`)
            if (task.status === 'blocked') secondary.push('Blocked')
            return (
              <div key={task._id}>
                <ListItem
                  secondaryAction={
                    <Chip
                      size="small"
                      color={task.status === 'blocked' ? 'warning' : 'primary'}
                      label={trade?.name || 'Trade'}
                      onClick={() => navigate(`/homes/${id}/trades/${trade?._id}`)}
                    />
                  }
                >
                  <ListItemText primary={task.title} secondary={secondary.join(' · ')} />
                </ListItem>
                {idx < actionsRequired.length - 1 && <Divider component="li" />}
              </div>
            )
          })}
          {!actionsRequired.length && <Typography variant="body2" color="text.secondary">No immediate actions</Typography>}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Budget Overview</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Budget</Typography>
            <Typography variant="h6">{fmtMoney(budgetSummary.totalBudget)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Paid</Typography>
            <Typography variant="h6">{fmtMoney(budgetSummary.totalPaid)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Outstanding</Typography>
            <Typography variant="h6">{fmtMoney(budgetSummary.totalOutstanding)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Invoiced (All)</Typography>
            <Typography variant="h6">{fmtMoney(budgetSummary.totalInvoiced)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Additional Costs</Typography>
            <Typography variant="h6">{fmtMoney(budgetSummary.totalExtras)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Variance</Typography>
            <Typography variant="h6" sx={{ color: budgetSummary.totalVariance > 0 ? 'error.main' : 'success.main' }}>
              {fmtMoney(budgetSummary.totalVariance)}
            </Typography>
          </Box>
        </Box>
        <Button size="small" sx={{ mt: 2 }} onClick={() => navigate(`/homes/${id}/budget`)}>Open budget</Button>
      </Paper>
    </Stack>
  )
}


