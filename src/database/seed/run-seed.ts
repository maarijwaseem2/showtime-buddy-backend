import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import {
  User,
  Cinema,
  Screen,
  Movie,
  Showtime,
  Booking,
} from '../entities';
import { UserRole, MovieStatus, SEAT_ROWS, SEAT_COLS, VIP_ROWS } from '../../common/enums';
import { postgresConfigFromEnv } from '../database.config';

config();

const MOVIES = [
  {
    slug: 'the-dark-night',
    title: 'The Dark Night',
    posterFile: 'movie-1.jpg',
    genre: ['Action', 'Thriller'],
    language: 'English',
    duration: '2h 32m',
    rating: 8.9,
    ageRating: 'PG-13',
    releaseDate: '2026-05-01',
    description:
      'A vigilante battles a chaos-loving mastermind across a neon-soaked city in this gripping action thriller.',
    cast: ['Liam Carter', 'Sofia Reyes', 'Marcus Chen'],
    director: 'Nora Black',
    status: MovieStatus.NOW_SHOWING,
  },
  {
    slug: 'starlight-promise',
    title: 'Starlight Promise',
    posterFile: 'movie-2.jpg',
    genre: ['Romance', 'Drama'],
    language: 'English',
    duration: '1h 58m',
    rating: 7.8,
    ageRating: 'PG',
    releaseDate: '2026-04-22',
    description:
      'Two strangers meet under a meteor shower and discover a love that bends time itself.',
    cast: ['Ava Monroe', 'Daniel Park'],
    director: 'Iris Lane',
    status: MovieStatus.NOW_SHOWING,
  },
  {
    slug: 'faric-beyond',
    title: 'Faric: Beyond',
    posterFile: 'movie-3.jpg',
    genre: ['Sci-Fi', 'Adventure'],
    language: 'English',
    duration: '2h 18m',
    rating: 8.4,
    ageRating: 'PG-13',
    releaseDate: '2026-05-10',
    description:
      'An astronaut crash-lands on a glowing alien world and must decode its secrets to make it home.',
    cast: ['Ethan Cole', 'Maya Singh'],
    director: 'Ravi Mehta',
    status: MovieStatus.NOW_SHOWING,
  },
  {
    slug: 'whispering-woods',
    title: 'Whispering Woods',
    posterFile: 'movie-4.jpg',
    genre: ['Horror', 'Mystery'],
    language: 'Urdu',
    duration: '1h 47m',
    rating: 7.2,
    ageRating: 'R',
    releaseDate: '2026-05-15',
    description:
      'A team of paranormal investigators enters a forest where the trees remember every scream.',
    cast: ['Hira Khan', 'Bilal Ahmed'],
    director: 'Sara Tariq',
    status: MovieStatus.NOW_SHOWING,
  },
  {
    slug: 'dragon-realm',
    title: 'Dragon Realm',
    posterFile: 'movie-5.jpg',
    genre: ['Animation', 'Family'],
    language: 'English',
    duration: '1h 45m',
    rating: 8.1,
    ageRating: 'U',
    releaseDate: '2026-06-01',
    description:
      'Two siblings befriend a fire-breathing dragon and journey across floating islands to save their kingdom.',
    cast: ['Voice: Lily Ross', 'Voice: Sam Park'],
    director: 'Toby Lin',
    status: MovieStatus.UPCOMING,
  },
  {
    slug: 'road-trippers',
    title: 'Road Trippers',
    posterFile: 'movie-6.jpg',
    genre: ['Comedy'],
    language: 'English',
    duration: '1h 52m',
    rating: 7.5,
    ageRating: 'PG-13',
    releaseDate: '2026-05-20',
    description:
      'Four friends, one vintage convertible, and a road trip that goes hilariously off the rails.',
    cast: ['Jess Hill', 'Omar Faruq', 'Nina Tate', 'Leo Park'],
    director: 'Maya Diaz',
    status: MovieStatus.UPCOMING,
  },
];

const CINEMAS = [
  { name: 'Atrium Cinema', screen: 'Screen 1' },
  { name: 'Nueplex Cinema', screen: 'VIP Hall' },
  { name: 'Cinepax', screen: 'Screen 2' },
  { name: 'Universal Cinema', screen: 'Screen 3' },
];

const SLOT_TEMPLATES = [
  { time: '12:30 PM', priceStandard: 800, priceVip: 1200, cinemaIdx: 0 },
  { time: '03:00 PM', priceStandard: 900, priceVip: 1400, cinemaIdx: 1 },
  { time: '06:00 PM', priceStandard: 1000, priceVip: 1500, cinemaIdx: 2 },
  { time: '09:30 PM', priceStandard: 1000, priceVip: 1500, cinemaIdx: 3 },
];

async function copyPoster(filename: string): Promise<string> {
  const frontendAssets = join(
    process.cwd(),
    '..',
    'showtime-buddy-frontend',
    'src',
    'assets',
    filename,
  );

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret && existsSync(frontendAssets)) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const result = await cloudinary.uploader.upload(frontendAssets, {
      folder: 'showtime/posters',
      public_id: filename.replace(/\.[^.]+$/, ''),
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  }

  // Fallback: copy to local filesystem
  const postersDir = join(process.cwd(), 'uploads', 'posters');
  await mkdir(postersDir, { recursive: true });
  const dest = join(postersDir, filename);
  if (existsSync(frontendAssets)) {
    await copyFile(frontendAssets, dest);
  }
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  return `${apiUrl}/uploads/posters/${filename}`;
}

async function run() {
  const db = postgresConfigFromEnv();
  const ds = new DataSource({
    type: 'postgres',
    ...db,
    entities: [User, Cinema, Screen, Movie, Showtime, Booking],
    synchronize: false,
  });

  await ds.initialize();
  console.log('Database connected. Seeding...');

  const userRepo = ds.getRepository(User);
  const cinemaRepo = ds.getRepository(Cinema);
  const screenRepo = ds.getRepository(Screen);
  const movieRepo = ds.getRepository(Movie);
  const showtimeRepo = ds.getRepository(Showtime);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cineslot.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = userRepo.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      fullName: 'CineSlot Admin',
      phone: null,
      role: UserRole.ADMIN,
    });
    await userRepo.save(admin);
    console.log(`Admin created: ${adminEmail}`);
  }

  const screens: Screen[] = [];
  for (const c of CINEMAS) {
    let cinema = await cinemaRepo.findOne({ where: { name: c.name } });
    if (!cinema) {
      cinema = await cinemaRepo.save(cinemaRepo.create({ name: c.name, city: 'Karachi' }));
    }
    let screen = await screenRepo.findOne({
      where: { cinemaId: cinema.id, name: c.screen },
    });
    if (!screen) {
      screen = await screenRepo.save(
        screenRepo.create({
          cinemaId: cinema.id,
          name: c.screen,
          rows: SEAT_ROWS,
          seatCols: SEAT_COLS,
          vipRows: VIP_ROWS,
        }),
      );
    }
    screens.push(screen);
  }

  for (const m of MOVIES) {
    const posterUrl = await copyPoster(m.posterFile);
    let movie = await movieRepo.findOne({ where: { slug: m.slug } });
    if (!movie) {
      movie = movieRepo.create({
        slug: m.slug,
        title: m.title,
        posterUrl,
        genre: m.genre,
        language: m.language,
        duration: m.duration,
        rating: m.rating,
        ageRating: m.ageRating,
        releaseDate: m.releaseDate,
        description: m.description,
        cast: m.cast,
        director: m.director,
        status: m.status,
      });
      await movieRepo.save(movie);
      console.log(`Movie: ${m.title}`);
    }

    if (m.status === MovieStatus.NOW_SHOWING) {
      const start = new Date();
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + d);
        const showDate = date.toISOString().slice(0, 10);

        for (const slot of SLOT_TEMPLATES) {
          const screen = screens[slot.cinemaIdx];
          const exists = await showtimeRepo.findOne({
            where: {
              movieId: movie.id,
              screenId: screen.id,
              showDate,
              startTime: slot.time,
            },
          });
          if (!exists) {
            await showtimeRepo.save(
              showtimeRepo.create({
                movieId: movie.id,
                screenId: screen.id,
                showDate,
                startTime: slot.time,
                priceStandard: slot.priceStandard,
                priceVip: slot.priceVip,
              }),
            );
          }
        }
      }
    }
  }

  await ds.destroy();
  console.log('Seed completed.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
