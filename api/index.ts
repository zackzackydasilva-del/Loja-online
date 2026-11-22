import type { Request, Response } from 'express';
import { app } from '../src/server/apiApp.ts';

export default function handler(req: Request, res: Response) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__path');
    const qs = parsed.searchParams.toString();
    req.url = `/api/${rewrittenPath.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
  } else if (!rawUrl.startsWith('/api')) {
    req.url = `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  return app(req, res);
}
