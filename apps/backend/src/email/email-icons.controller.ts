import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';

const ALLOWED_ICONS = new Set([
  'icon-clock.png',
  'icon-copy.png',
  'icon-facebook.png',
  'icon-instagram.png',
  'icon-link.png',
  'icon-lock.png',
  'icon-people.png',
  'icon-shield.png',
]);

@Public()
@Controller('email/icons')
export class EmailIconsController {
  private readonly iconsDir = resolveEmailIconsDir();

  @Get(':filename')
  getIcon(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    if (!ALLOWED_ICONS.has(filename)) {
      throw new NotFoundException();
    }

    const filePath = join(this.iconsDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException();
    }

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return new StreamableFile(createReadStream(filePath));
  }
}

function resolveEmailIconsDir(): string {
  const candidates = [
    join(process.cwd(), 'assets', 'email'),
    join(process.cwd(), 'dist', 'assets', 'email'),
    join(__dirname, '..', '..', '..', 'assets', 'email'),
    join(__dirname, '..', '..', 'assets', 'email'),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'icon-lock.png'))) {
      return dir;
    }
  }

  return join(process.cwd(), 'assets', 'email');
}
