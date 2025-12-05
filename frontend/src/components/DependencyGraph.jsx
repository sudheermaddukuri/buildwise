import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'

export default function DependencyGraph({ trades = [], allTrades = [], phaseKey = 'preconstruction', height = 360, onNodeClick }) {
  const ref = useRef(null)
  const data = useMemo(() => {
    const nodes = []
    const links = []
    const tradeIdToName = {}
    for (const t of allTrades) tradeIdToName[t._id] = t.name
    for (const t of trades) {
      for (const task of (t.tasks || [])) {
        if ((task.phaseKey || phaseKey) !== phaseKey) continue
        nodes.push({ id: task._id, label: task.title, group: t._id, tradeName: t.name })
        for (const dep of (task.dependsOn || [])) {
          links.push({ source: dep.taskId, target: task._id })
        }
      }
    }
    return { nodes, links }
  }, [trades, allTrades, phaseKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const width = el.clientWidth || 600
    const svg = d3.select(el).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .style('background', 'transparent')
    const color = d3.scaleOrdinal(d3.schemeTableau10)

    // Build adjacency and compute layered (top-down) layout
    const idToNode = new Map(data.nodes.map(n => [n.id, n]))
    const outAdj = new Map()
    const inAdj = new Map()
    data.nodes.forEach(n => { outAdj.set(n.id, []); inAdj.set(n.id, []) })
    data.links.forEach(l => {
      if (outAdj.has(l.source)) outAdj.get(l.source).push(l.target)
      if (inAdj.has(l.target)) inAdj.get(l.target).push(l.source)
    })
    const layer = new Map(data.nodes.map(n => [n.id, 0]))
    let changed = true
    let iter = 0
    while (changed && iter < 100) {
      changed = false
      iter++
      for (const n of data.nodes) {
        const preds = inAdj.get(n.id) || []
        const maxPred = preds.reduce((m, p) => Math.max(m, (layer.get(p) ?? 0)), 0)
        if (maxPred + 1 > (layer.get(n.id) ?? 0)) {
          layer.set(n.id, maxPred + 1)
          changed = true
        }
      }
    }
    const maxLayer = Math.max(0, ...Array.from(layer.values()))
    const layers = Array.from({ length: maxLayer + 1 }, () => [])
    data.nodes.forEach(n => {
      const L = layer.get(n.id) || 0
      layers[L].push(n)
    })
    // Assign positions (top-down): y by layer, x by index
    const topPad = 24
    const colGap = Math.max(120, width / Math.max(1, Math.max(...layers.map(a => a.length))))
    const rowGap = Math.max(90, (height - topPad) / Math.max(1, layers.length))
    layers.forEach((arr, i) => {
      const totalWidth = (arr.length - 1) * colGap
      const startX = (width - totalWidth) / 2
      arr.forEach((n, j) => {
        n.x = startX + j * colGap
        n.y = topPad + i * rowGap
      })
    })

    const g = svg.append('g')

    const link = g.append('g')
      .attr('stroke', '#6b7280')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', 1.5)

    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        try {
          if (typeof onNodeClick === 'function') onNodeClick(d)
        } catch {}
      })

    node.append('circle')
      .attr('r', 14)
      .attr('fill', d => color(d.group))
      .attr('stroke', '#0b1220')
      .attr('stroke-width', 1)

    node.append('text')
      .text(d => d.label)
      .attr('x', 18)
      .attr('y', 4)
      .attr('font-size', 11)
      .attr('fill', '#e6ebff')

    node.append('title').text(d => `${d.tradeName}: ${d.label}`)

    // Position nodes and links (straight segments top-down)
    link
      .attr('x1', d => (idToNode.get(d.source)?.x ?? 0))
      .attr('y1', d => (idToNode.get(d.source)?.y ?? 0) + 14)
      .attr('x2', d => (idToNode.get(d.target)?.x ?? 0))
      .attr('y2', d => (idToNode.get(d.target)?.y ?? 0) - 14)

    node.attr('transform', d => `translate(${d.x},${d.y})`)

    // Zoom & Pan
    const z = d3.zoom().scaleExtent([0.2, 2]).on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
    svg.call(z)

    // Fit to view
    const bbox = g.node().getBBox()
    const scale = Math.min((width - 40) / Math.max(1, bbox.width), (height - 40) / Math.max(1, bbox.height), 1)
    const tx = (width - bbox.width * scale) / 2 - bbox.x * scale
    const ty = (height - bbox.height * scale) / 2 - bbox.y * scale
    const initial = d3.zoomIdentity.translate(tx, ty).scale(scale)
    svg.call(z.transform, initial)
    svg.on('dblclick.zoom', null)
    svg.on('dblclick', () => svg.call(z.transform, initial))

    return () => {
      // cleanup events
      svg.on('.zoom', null)
    }
  }, [data, height])

  return <div ref={ref} style={{ width: '100%', height }} />
}


