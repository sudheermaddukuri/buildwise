import { Fragment } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'

/**
 * Reusable page header with:
 * - back button (optional)
 * - title
 * - breadcrumbs (optional)
 * - right-side actions (optional)
 *
 * Props:
 * - title: string | node
 * - onBack?: () => void
 * - breadcrumbs?: Array<{ label: string, href?: string }>
 * - actions?: ReactNode
 */
export default function PageHeader({ title, onBack, breadcrumbs = [], actions = null }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          {onBack ? (
            <IconButton aria-label="Back" onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {actions}
        </Box>
      </Stack>
      {breadcrumbs?.length ? (
        <Box sx={{ mt: 1 }}>
          <Breadcrumbs aria-label="breadcrumb">
            {breadcrumbs.map((b, idx) => (
              <Fragment key={`${b.label}-${idx}`}>
                {b.href ? (
                  <Link underline="hover" color="inherit" href={b.href}>
                    {b.label}
                  </Link>
                ) : (
                  <Typography color="text.primary">{b.label}</Typography>
                )}
              </Fragment>
            ))}
          </Breadcrumbs>
        </Box>
      ) : null}
    </Box>
  )
}


