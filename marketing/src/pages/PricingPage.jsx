import React from 'react';
import { Box, Container, Grid, Card, CardContent, CardHeader, Typography, Stack, Divider, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function PricingPage() {
	const plans = [
		{
			name: 'Guide',
			price: 'Contact for pricing',
			tagline: 'Essentials to run your own build',
			features: [
				'Phase‑by‑phase tasks & checklists',
				'Quality check gates per trade',
				'Document templates & logs',
				'Email support'
			],
			details: [
				'Trade playbooks help prevent scope gaps across electrical, plumbing, HVAC and more—aligned to how builders orchestrate work.',
				'Quality gates explain what to verify and when (e.g., waterproofing before tile) to avoid rework and change orders.',
				'Templates cover RFIs, submittals, and punchlists so designer → field handoff is clear and traceable.',
				'Best for owners who want structured tools and guidance while self‑managing subs and schedule.'
			],
			cta: 'Start free trial'
		},
		{
			name: 'AI Assurance',
			price: 'Contact for pricing',
			tagline: 'AI plan + bid analysis',
			features: [
				'AI plan & drawing analysis',
				'Bid & contract checks',
				'Bid comparison across vendors',
				'Variance & omission flags',
				'Priority support'
			],
			featured: true,
			details: [
				'Uploads are read and normalized to highlight what each bid includes/excludes—no more apples vs oranges.',
				'Follow‑up questions are generated when critical specs are missing (e.g., cabinet species, finish system, hardware).',
				'Plan checks surface conflicts between sheets and trades to reduce field surprises.',
				'Best for owners who want rigorous document/bid review before awarding work.'
			],
			cta: 'Start free trial'
		},
		{
			name: 'Concierge',
			price: 'Contact for pricing',
			tagline: 'Dedicated coordinator / onsite',
			features: [
				'Dedicated builder coordinator',
				'Schedule & vendor orchestration',
				'Onsite support (optional)',
				'Executive reporting'
			],
			details: [
				'We act as your builder‑side partner: coordinating trades, sequencing, and closing gaps between design and field.',
				'Hands‑on phone and personal support when decisions or issues arise; we translate builder language into clear actions.',
				'We prepare inspectors/HOA submissions and help you navigate approvals and re‑inspections.',
				'Best when you want a human safety‑net guiding calls, scheduling, and vendor accountability.'
			],
			cta: 'Contact for pricing'
		},
		{
			name: 'Part‑time Onsite',
			price: 'Contact for pricing',
			tagline: 'Up to 10 hours onsite support',
			features: [
				'Onsite coordinator (up to 10 hours)',
				'Coverage at key checkpoints',
				'Travel within service area',
				'Extendable hours on request'
			],
			details: [
				'Use for critical milestones (framing QA, MEP rough‑in walk, envelope/waterproofing checks, finals & closeout).',
				'We align designer intent with field execution: catch issues early and avoid downstream change orders.',
				'Includes phone support around the visit to prepare scope, checklist, and follow‑ups with trades.',
				'Ideal add‑on when you want expert eyes onsite without a full‑time coordinator.'
			],
			cta: 'Contact for pricing'
		}
	];

	const addOns = [
		{
			name: 'Local Subcontractors',
			desc: 'Access to vetted local trades with performance references and faster bid cycles.',
			bullets: ['Vetted subs across major trades', 'RFI + bid support', 'Fair, comparable bids'],
			details: [
				'We curate shortlists matched to your scope and budget to reduce re‑bid cycles.',
				'Lightweight qualification—references and recent performance—so you award with confidence.'
			]
		},
		{
			name: 'Builder Discounts Access',
			desc: 'Pro pricing at tile, roofing, countertops, cabinets, paint, lumber & more.',
			bullets: ['Supplier introductions', 'SKU & selection guidance', 'Lead‑time planning'],
			details: [
				'Leverage our builder registrations for negotiated pricing at major suppliers.',
				'We guide selections to avoid backorders and integrate lead times into your schedule.'
			]
		},
		{
			name: 'Designer & Architect Access',
			desc: 'Curated partners for concept, specs, and permit‑ready packages.',
			bullets: ['Interior design partners', 'Architectural partners', 'Value engineering support'],
			details: [
				'We bridge the designer → field gap so specs are buildable and coordinated across trades.',
				'Partners collaborate on value‑engineering without compromising design intent.'
			]
		}
	];

	return (
		<Box sx={{ py: 8 }}>
			<Container maxWidth="lg">
				<Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Pricing & Plans</Typography>
				<Typography color="text.secondary" sx={{ mb: 4 }}>Contact us for pricing. Plans are tailored per project; add onsite and packages as needed.</Typography>
				<Grid container spacing={2} sx={{ mb: 4 }}>
					{plans.map((p) => (
						<Grid item xs={12} md={4} key={p.name}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: p.featured ? 'primary.light' : 'divider', backgroundColor: 'background.paper' }}>
								<CardHeader
									title={p.name}
									subheader={p.tagline}
									subheaderTypographyProps={{ color: 'text.secondary' }}
								/>
								<CardContent>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, mb: 1, color: 'text.primary' }}>{p.price}</Typography>
                  <Divider sx={{ borderColor: 'divider', mb: 1 }} />
									<Stack spacing={1}>
										{p.features.map((f) => (
											<Stack key={f} direction="row" spacing={1} alignItems="center">
												<CheckCircleIcon color="success" fontSize="small" />
												<Typography color="text.secondary">{f}</Typography>
											</Stack>
										))}
									</Stack>
									{Array.isArray(p.details) && p.details.length ? (
										<>
											<Divider sx={{ borderColor: 'divider', my: 1 }} />
											<Typography variant="subtitle2" sx={{ mb: .5 }}>Why this matters</Typography>
											<Stack spacing={0.5}>
												{p.details.map((d) => (
													<Typography key={d} color="text.secondary">• {d}</Typography>
												))}
											</Stack>
										</>
									) : null}
								</CardContent>
								<CardContent>
									<Button
										variant="contained"
										onClick={() => {
											const name = (p.name || '').toLowerCase();
											if (name.includes('ai')) {
												window.location.hash = '#/register?plan=ai_assurance';
											} else if (name.includes('guide')) {
												window.location.hash = '#/register?plan=guide';
											} else {
												window.location.hash = '#/';
												setTimeout(() => {
													const el = document.getElementById('contact');
													if (el) el.scrollIntoView({ behavior: 'smooth' });
												}, 50);
											}
										}}
									>
										{p.cta}
									</Button>
									{p.featured ? <Chip label="Most Popular" color="success" size="small" sx={{ ml: 1 }} /> : null}
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>

				<Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Add‑On Packages</Typography>
				<Grid container spacing={2}>
					{addOns.map((a) => (
						<Grid item xs={12} md={4} key={a.name}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', backgroundColor: 'background.paper' }}>
								<CardContent>
									<Typography variant="h6">{a.name}</Typography>
									<Typography color="text.secondary" sx={{ mb: 1 }}>{a.desc}</Typography>
									<Stack spacing={1}>
										{a.bullets.map((b) => (
											<Stack key={b} direction="row" spacing={1} alignItems="center">
												<CheckCircleIcon color="success" fontSize="small" />
												<Typography color="text.secondary">{b}</Typography>
											</Stack>
										))}
									</Stack>
									{Array.isArray(a.details) && a.details.length ? (
										<>
                  <Divider sx={{ borderColor: 'divider', my: 1 }} />
											<Typography variant="subtitle2" sx={{ mb: .5 }}>Details</Typography>
											<Stack spacing={0.5}>
												{a.details.map((d) => (
													<Typography key={d} color="text.secondary">• {d}</Typography>
												))}
											</Stack>
										</>
									) : null}
								</CardContent>
								<CardContent>
									<Button
										variant="outlined"
										onClick={() => {
											window.location.hash = '#/'
											setTimeout(() => {
												const el = document.getElementById('contact')
												if (el) el.scrollIntoView({ behavior: 'smooth' })
											}, 50)
										}}
									>
										Talk to us
									</Button>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			</Container>
		</Box>
	);
}

