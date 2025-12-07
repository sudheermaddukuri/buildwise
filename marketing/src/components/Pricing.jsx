import React from 'react';
import { Box, Container, Grid, Card, CardContent, CardActions, Typography, Divider, Stack, Chip, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Pricing() {
  const tiers = [
    {
      name: 'Guide',
      subtitle: 'Essential tools',
      features: ['Task guidance for all phases', 'Self quality‑checks', 'Checklists and templates', 'Email support'],
      cta: 'Start free trial',
      priceDisplay: 'Contact for pricing',
      chipLabel: 'Tailored • per home'
    },
    {
      name: 'AI Assurance',
      subtitle: 'Plan + bid analysis',
      features: ['AI plan & drawing analysis', 'Bid & contract checks', 'Bid comparison across vendors', 'Variance & omission flags', 'Priority support'],
      cta: 'Start free trial',
      featured: true,
      priceDisplay: 'Contact for pricing',
      chipLabel: 'Tailored • per home'
    },
    {
      name: 'Concierge',
      subtitle: 'Pro coordinator',
      features: ['Dedicated builder coordinator', 'End‑to‑end build support', 'Optional onsite support', 'Executive reporting'],
      cta: 'Contact for pricing',
      priceDisplay: 'Contact for pricing',
      chipLabel: 'Per home • custom'
    },
    {
      name: 'Part‑time Onsite',
      subtitle: 'Up to 10 hours onsite support',
      features: [
        'Onsite coordinator (up to 10 hours)',
        'Schedule coverage at key checkpoints',
        'Travel within service area',
        'Extendable hours on request'
      ],
      cta: 'Contact for pricing',
      priceDisplay: 'Contact for pricing',
      chipLabel: 'Add‑on • onsite'
    },
    {
      name: 'Local Subcontractors',
      subtitle: 'Curated trade network',
      features: [
        'Access to vetted local subs across major trades',
        'Faster bid cycles and better coverage',
        'Performance history and references'
      ],
      cta: 'Get access',
      priceDisplay: 'Add‑on package',
      chipLabel: 'Add‑on • custom'
    },
    {
      name: 'Builder Discounts Access',
      subtitle: 'Pro pricing at top suppliers',
      features: [
        'Tile, roofing, countertops, cabinets, paint, lumber & more',
        'Leverage our builder registrations with major suppliers',
        'Guidance on SKUs, selections, and lead times'
      ],
      cta: 'Unlock discounts',
      priceDisplay: 'Add‑on package',
      chipLabel: 'Add‑on • save more'
    },
    {
      name: 'Designer & Architect Access',
      subtitle: 'Pro design partners',
      features: [
        'Access to trusted interior designers & architects',
        'Concept to permit‑ready coordination',
        'Spec packages and value‑engineering support'
      ],
      cta: 'Meet partners',
      priceDisplay: 'Add‑on package',
      chipLabel: 'Add‑on • curated'
    }
  ];
  return (
    <Box id="pricing" sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Pricing</Typography>
        <Typography color="text.secondary">Contact us for pricing. Plans are tailored per home; add onsite or packages as needed.</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {tiers.map((t) => (
            <Grid item xs={12} md={4} key={t.name}>
              <Card variant="outlined" sx={{
                height: '100%',
                borderColor: t.featured ? 'primary.light' : 'divider',
                outline: t.featured ? '2px solid rgba(25,118,210,.15)' : 'none',
                backgroundColor: 'background.paper'
              }}>
                <CardContent>
                  <Typography variant="h6">{t.name}</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>{t.subtitle}</Typography>
                  <Typography sx={{ mb: 1, fontWeight: 800, fontSize: 24, color: 'text.primary' }}>
                    {t.priceDisplay}
                  </Typography>
                  <Divider sx={{ borderColor: 'divider', mb: 1 }} />
                  <Stack spacing={1}>
                    {t.features.map((f) => (
                      <Stack key={f} direction="row" spacing={1} alignItems="center">
                        <CheckCircleIcon color="success" fontSize="small" />
                        <Typography color="text.secondary">{f}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <Chip label={t.chipLabel} variant="outlined" sx={{ borderColor: 'divider', color: 'text.secondary' }} />
                  <Button
                    variant="contained"
                    sx={{ color: '#0b1220' }}
                    onClick={() => {
                      const plan = t.name.toLowerCase().includes('ai') ? 'ai_assurance' : 'guide'
                      window.location.hash = `#/register?plan=${plan}`
                    }}
                  >
                    {t.cta}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}


