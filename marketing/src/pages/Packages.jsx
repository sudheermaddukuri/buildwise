import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Stack, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Packages() {
	const packagesList = [
		{
			name: 'Bid Comparison Package',
			desc: 'Structured, apples‑to‑apples comparisons across vendors for any trade.',
			bullets: [
				'Normalize inclusions/exclusions, quantities, unit rates, warranties',
				'Call out gaps and risky assumptions before you sign',
				'Targeted follow‑up questions per vendor to fill missing details'
			],
			cta: 'Compare my bids'
		},
		{
			name: 'Builder Discounts Access',
			desc: 'Unlock pro pricing and guidance at top material suppliers.',
			bullets: [
				'Tile, roofing, countertops, cabinets, paint, lumber & more',
				'Supplier introductions and SKU/lead‑time guidance',
				'Leverage our builder registrations to save thousands'
			],
			cta: 'Unlock discounts'
		},
		{
			name: 'Hire Subs via Buildwise',
			desc: 'Access vetted local subcontractors with performance references.',
			bullets: [
				'Curated shortlists per trade and project size',
				'Bid intake and RFI coordination',
				'Support during award and onboarding'
			],
			cta: 'Get subcontractor list'
		},
		{
			name: 'Designer & Architect Access',
			desc: 'Tap into trusted partners for concept, specs, and permitting.',
			bullets: [
				'Interior design and architectural partners',
				'Spec packages aligned to field execution',
				'Value engineering without compromising intent'
			],
			cta: 'Meet partners'
		}
	];

	return (
		<Box sx={{ py: 8 }}>
			<Container maxWidth="lg">
				<Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Packages</Typography>
				<Typography color="text.secondary" sx={{ mb: 4 }}>
					Start with a subscription, then add the packages you need. Each package includes guided checklists and direct support.
				</Typography>
				<Grid container spacing={2}>
					{packagesList.map((p) => (
						<Grid item xs={12} md={6} key={p.name}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', backgroundColor: 'background.paper' }}>
								<CardContent>
									<Typography variant="h5" sx={{ fontWeight: 700 }}>{p.name}</Typography>
									<Typography color="text.secondary" sx={{ mb: 1 }}>{p.desc}</Typography>
									<Stack spacing={1} sx={{ mb: 2 }}>
										{p.bullets.map((b) => (
											<Stack key={b} direction="row" spacing={1} alignItems="center">
												<CheckCircleIcon color="success" fontSize="small" />
												<Typography color="text.secondary">{b}</Typography>
											</Stack>
										))}
									</Stack>
									<Button
										variant="contained"
										sx={{ color: '#0b1220' }}
										onClick={() => {
											window.location.hash = '#/'
											setTimeout(() => {
												const el = document.getElementById('contact')
												if (el) el.scrollIntoView({ behavior: 'smooth' })
											}, 50)
										}}
									>
										{p.cta}
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

