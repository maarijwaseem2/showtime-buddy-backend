import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { v2 as cloudinary } from 'cloudinary';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async savePoster(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('Poster file is required');

    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      throw new BadRequestException('Only jpg, png, webp allowed');
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'showtime/posters', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }
}
