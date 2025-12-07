import React from 'react';
import { Box, Container, Grid, Typography, Stack, Button, Chip, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Hero() {
  return (
    <Box id="top" sx={{ py: { xs: 6, md: 10 }, background:
      'radial-gradient(900px 360px at 80% -10%, rgba(25,118,210,.10), transparent), radial-gradient(620px 220px at 20% 0%, rgba(76,175,80,.10), transparent)'
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 46 }, fontWeight: 800, mb: 1 }}>
              BuildWise AI
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 18, mb: 2 }}>
              Your AI co‑pilot for building with confidence: analyze plans and bids, catch costly mistakes early, and guide every step with self‑checks.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
              <Button variant="contained" sx={{ color: '#0b1220' }} onClick={() => { window.location.hash = '#/register?plan=ai_assurance' }}>Start Free Trial</Button>
              <Button variant="outlined" onClick={() => document.getElementById('pricing').scrollIntoView({behavior:'smooth'})}>See pricing</Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {['Plan and drawing analysis', 'Bid and contract assurance', 'Task guidance and quality checks', 'Optional onsite coordination'].map((label) => (
                <Chip key={label} label={label} variant="outlined" sx={{ borderColor: '#253154', color: 'text.secondary' }} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'divider', backgroundColor: 'background.paper' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <CheckCircleIcon color="success" />
                <Typography fontWeight={700}>AI Plan Review</Typography>
              </Stack>
              <Box sx={{ pt: 1.5, color: 'text.secondary' }}>
                <Typography><Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>Find conflicts</Box> in structural, MEP, and finish schedules.</Typography>
                <Typography sx={{ mt: .5 }}><Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>Spot omissions</Box> before bids go out.</Typography>
                <Typography sx={{ mt: .5 }}><Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>Reduce change orders</Box> during construction.</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}


