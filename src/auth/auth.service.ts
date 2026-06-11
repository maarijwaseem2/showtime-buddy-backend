import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../common/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private sanitize(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      role: UserRole.USER,
    });
    await this.usersRepo.save(user);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  me(user: User) {
    return this.sanitize(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    // Generic response so we don't reveal which emails are registered
    if (!user) {
      return { message: 'If that email exists, a reset code has been issued' };
    }

    const code = String(randomInt(100000, 1000000));
    user.resetTokenHash = await bcrypt.hash(code, 10);
    user.resetTokenExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
    await this.usersRepo.save(user);

    // No email service configured: code is returned in the response.
    // Plug an email provider here and remove `resetCode` for production.
    return {
      message: 'Reset code generated. Use it within 15 minutes.',
      resetCode: code,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    if (user.resetTokenExpires.getTime() < Date.now()) {
      throw new BadRequestException('Reset code has expired');
    }
    const ok = await bcrypt.compare(dto.code, user.resetTokenHash);
    if (!ok) throw new BadRequestException('Invalid or expired reset code');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await this.usersRepo.save(user);

    return { message: 'Password updated. You can now sign in.' };
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.sanitize(user),
    };
  }
}
