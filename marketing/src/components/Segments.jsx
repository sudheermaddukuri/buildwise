import React from 'react';
import { Box, Container, Grid, Card, CardContent, Typography } from '@mui/material';

export default function Segments() {
  const segs = [
    { title: 'Build‑Your‑Home', desc: 'Clarity from day one: scope, selections, and schedule guardrails.' },
    { title: 'Custom high‑end', desc: 'Reduce rework on complex finishes and specialty trades.' },
    { title: 'Commercial', desc: 'Detect design‑build gaps, coordinate subs, control RFIs.' },
    { title: 'Townhome', desc: 'Standardize scopes while catching model‑specific variances.' },
  ];
  return (
    <Box id="segments" sx={{ py: 8, background: 'linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0))' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>Built for your segment</Typography>
        <Grid container spacing={2}>
          {segs.map((s) => (
            <Grid item xs={12} md={3} key={s.title}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: .5 }}>{s.title}</Typography>
                  <Typography color="text.secondary">{s.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}


