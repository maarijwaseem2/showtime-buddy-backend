import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  private get uploadDir(): string {
    return this.config.get<string>('UPLOAD_DIR', 'uploads');
  }

  async savePoster(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('Poster file is required');

    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      throw new BadRequestException('Only jpg, png, webp allowed');
    }

    const postersDir = join(process.cwd(), this.uploadDir, 'posters');
    await mkdir(postersDir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const fullPath = join(postersDir, filename);
    await writeFile(fullPath, file.buffer);

    return `/uploads/posters/${filename}`;
  }
}
