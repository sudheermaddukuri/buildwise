import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'

export default function PhaseTimeline({ schedules = [], tasks = [], height = 240 }) {
  const ref = useRef(null)
  const data = useMemo(() => {
    // Build bars for schedules; points for task due dates
    const bars = (schedules || []).map((s) => ({
      id: s._id,
      label: s.title,
      start: new Date(s.startsAt),
      end: new Date(s.endsAt),
      type: 'schedule',
      tradeId: s.bidId || '',
    }))
    const points = (tasks || [])
      .filter((t) => !!t.dueDate)
      .map((t) => ({
        id: t._id,
        label: `${t.tradeName || ''} — ${t.title}`,
        date: new Date(t.dueDate),
        type: 'task',
      }))
    const allDates = [
      ...bars.flatMap((b) => [b.start, b.end]),
      ...points.map((p) => p.date),
    ].filter(Boolean)
    const min = allDates.length ? new Date(Math.min(...allDates)) : new Date()
    const max = allDates.length ? new Date(Math.max(...allDates)) : new Date(Date.now() + 7 * 86400000)
    return { bars, points, min, max }
  }, [schedules, tasks])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const width = el.clientWidth || 600
    const margin = { top: 20, right: 20, bottom: 24, left: 80 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleTime().domain([data.min, data.max]).range([0, innerW]).nice()
    const yItems = [...data.bars.map((b) => `S:${b.id}`), ...data.points.map((p) => `T:${p.id}`)]
    const y = d3.scaleBand().domain(yItems).range([0, innerH]).padding(0.3)

    const xAxis = d3.axisBottom(x).ticks(5).tickSizeOuter(0)
    g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#9aa4c7')

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    // Bars for schedules
    g.selectAll('rect.schedule')
      .data(data.bars)
      .join('rect')
      .attr('class', 'schedule')
      .attr('x', d => x(d.start))
      .attr('y', d => y(`S:${d.id}`) || 0)
      .attr('width', d => Math.max(2, x(d.end) - x(d.start)))
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.tradeId || 'sched'))
      .attr('opacity', 0.8)

    // Points for task due dates
    g.selectAll('circle.task')
      .data(data.points)
      .join('circle')
      .attr('class', 'task')
      .attr('cx', d => x(d.date))
      .attr('cy', d => (y(`T:${d.id}`) || 0) + y.bandwidth() / 2)
      .attr('r', 5)
      .attr('fill', '#42e6a4')

    // Labels
    g.selectAll('text.bar-label')
      .data(data.bars)
      .join('text')
      .attr('x', d => x(d.start) + 4)
      .attr('y', d => (y(`S:${d.id}`) || 0) + y.bandwidth() / 2 + 4)
      .attr('font-size', 11)
      .attr('fill', '#e6ebff')
      .text(d => d.label)

    g.selectAll('text.point-label')
      .data(data.points)
      .join('text')
      .attr('x', d => x(d.date) + 8)
      .attr('y', d => (y(`T:${d.id}`) || 0) + y.bandwidth() / 2 + 4)
      .attr('font-size', 11)
      .attr('fill', '#e6ebff')
      .text(d => d.label)
  }, [data, height])

  return <div ref={ref} style={{ width: '100%', height }} />
}


