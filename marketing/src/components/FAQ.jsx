import React from 'react';
import { Box, Container, Stack, Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function FAQ() {
  const items = [
    { q: 'How is pricing structured?', a: 'Pricing is per home. Subscribe monthly or choose per‑project. Concierge is custom based on scope and location.' },
    { q: 'What file types do you support?', a: 'Typical architectural plan formats (PDF, image exports) and common bid/contract documents. Specialized formats can be discussed during onboarding.' },
    { q: 'Do you replace my GC or architect?', a: 'No. BuildWise AI is a decision‑support tool and coordination service. Your licensed professionals remain responsible for design and execution.' },
    { q: 'Is onsite support available?', a: 'Yes—via the Concierge plan’s professional builder coordinator, subject to location and schedule.' },
  ];
  return (
    <Box id="faq" sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>FAQ</Typography>
        <Stack spacing={1}>
          {items.map((it) => (
            <Accordion key={it.q} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>{it.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{it.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}


