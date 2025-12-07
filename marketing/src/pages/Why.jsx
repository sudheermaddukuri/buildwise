import React from 'react';
import { Box, Container, Typography, Stack, Card, CardContent } from '@mui/material';

export default function Why() {
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Why Buildwise? A Builder’s Playbook for Owners</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          We built our own homes. We felt the pain—and the potential. We learned the hard way that a great builder isn’t just a “nice to have”; they’re the connective tissue that keeps design, trades, suppliers, permits, and schedules aligned. But paying a flat 20–25% management fee isn’t the only path. Buildwise is how owners manage like a pro—without paying builder‑level margins.
        </Typography>
        <Stack spacing={3}>
          <Section title="What a builder really does (beyond swinging hammers)">
            <Bullet>Orchestrates dozens of trades so scopes don’t collide or leave gaps.</Bullet>
            <Bullet>Turns drawings into buildable plans: clarifies missing details, options, and alternates.</Bullet>
            <Bullet>Sequencing and schedule control: framing, MEP rough‑ins, insulation, drywall, finish.</Bullet>
            <Bullet>Vendor and material management: lead times, substitutions, value engineering.</Bullet>
            <Bullet>Permits and inspections: knowing what to submit, when, and how to pass the first time.</Bullet>
          </Section>

          <Section title="The DIY reality: where owners get burned">
            <Bullet>Scope gaps between trades (who owns water‑resistant drywall at tub walls?).</Bullet>
            <Bullet>Designer → field handoffs: specs missing, details unclear, or never coordinated.</Bullet>
            <Bullet>Bid apples vs oranges: one vendor includes waterproofing, another doesn’t.</Bullet>
            <Bullet>Unknown local subs and supplier networks; retail pricing instead of builder pricing.</Bullet>
            <Bullet>Permit/H.O.A. hurdles: submittals, engineering, inspections, and sequencing.</Bullet>
          </Section>

          <Section title="How Buildwise helps you act like a builder">
            <Bullet>Bid Comparison: line‑by‑line normalization to catch exclusions and hidden costs.</Bullet>
            <Bullet>Trade playbooks: checklists and quality gates for electrical, plumbing, HVAC, etc.</Bullet>
            <Bullet>Design‑to‑field alignment: prompts to close gaps (e.g., cabinet finishes, grout specs).</Bullet>
            <Bullet>Local Subcontractor Network: vetted trades, performance references, faster bids.</Bullet>
            <Bullet>Builder Discounts Access: tile, roofing, countertops, cabinets, paint, lumber, and more.</Bullet>
            <Bullet>Permits & HOA guides: what to file, typical review timelines, and inspection prep.</Bullet>
          </Section>

          <Section title="Why not just hire a builder?">
            <Typography color="text.secondary">
              Great builders are worth their fee. But if you want to self‑manage budget and scope, Buildwise gives you the same guardrails and relationships—without a blanket 25% markup. You decide where to DIY and where to bring in our Concierge (onsite) team.
            </Typography>
          </Section>

          <Section title="Next steps">
            <Bullet>Start with the <strong>Pricing</strong> page for subscriptions and add‑on packages.</Bullet>
            <Bullet>See <strong>Onsite Build</strong> if you want a dedicated coordinator at key milestones.</Bullet>
            <Bullet>Explore <strong>Packages</strong> for Bid Packs, Discounts Access, and Hiring Subs via Buildwise.</Bullet>
          </Section>
        </Stack>
      </Container>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Card variant="outlined" sx={{ borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Stack spacing={1}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

function Bullet({ children }) {
  return <Typography color="text.secondary">• {children}</Typography>;
}


