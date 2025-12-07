import React from 'react';
import { Box, Container, Typography, Stack, Card, CardContent, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Onsite() {
  const checkpoints = [
    'Pre‑construction kickoff: scope validation, bid plan, city/HOA roadmap',
    'Framing QA: layout checks, penetrations, blocking, shear/hardware verification',
    'MEP rough‑in coordination: electrical/plumbing/HVAC scopes align with design',
    'Envelope & insulation: WRB details, flashing, pans, insulation R‑values',
    'Drywall & finishes: level of finish, moisture areas, trim & cabinetry readiness',
    'Finals & closeout: punch‑list, commissioning, O&M docs, warranty handoff'
  ];
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Onsite Build: Your Dedicated Coordinator</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Want the confidence of a pro at the key moments? Our Concierge team provides onsite coordination at critical milestones, integrates with your trades, and uses the same Buildwise checklists and bid comparisons to keep the project on track.
        </Typography>
        <Card variant="outlined" sx={{ borderColor: 'divider', backgroundColor: 'background.paper', mb: 3 }}>
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Milestone Coverage</Typography>
            <Stack spacing={1}>
              {checkpoints.map((c) => (
                <Stack key={c} direction="row" spacing={1} alignItems="center">
                  <CheckCardIcon />
                  <Typography color="text.secondary">{c}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderColor: 'divider', backgroundColor: 'background.paper' }}>
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
            <Stack spacing={1}>
              <Typography color="text.secondary">• We scope your project and critical path.</Typography>
              <Typography color="text.secondary">• We align trades, subs, and inspectors around milestone dates.</Typography>
              <Typography color="text.secondary">• We attend key onsite checks and keep your plan, schedule, and budget on track.</Typography>
            </Stack>
            <Button variant="contained" sx={{ mt: 2, color: '#0b1220' }} onClick={() => { window.location.hash = '#/'; setTimeout(() => { const el = document.getElementById('contact'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 50); }}>Talk to our team</Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

function CheckCardIcon() {
  return <CheckCircleIcon color="success" fontSize="small" />;
}


