'use client';

import { useEffect } from 'react';
import { initEnvValidation } from '@/config/env.validation';

/**
 * Component that validates environment variables on client-side mount
 * Should be included early in the app tree
 */
export function EnvValidator() {
  useEffect(() => {
    initEnvValidation();
  }, []);

  return null;
}
