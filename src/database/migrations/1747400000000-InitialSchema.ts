import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1747400000000 implements MigrationInterface {
  name = 'InitialSchema1747400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "movies_status_enum" AS ENUM('now-showing', 'upcoming')`,
    );
    await queryRunner.query(
      `CREATE TYPE "bookings_status_enum" AS ENUM('confirmed', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "full_name" character varying NOT NULL,
        "phone" character varying,
        "role" "users_role_enum" NOT NULL DEFAULT 'USER',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cinemas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "city" character varying,
        "address" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_cinemas_name" UNIQUE ("name"),
        CONSTRAINT "PK_cinemas" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "screens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cinema_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "rows" text NOT NULL,
        "seat_cols" integer NOT NULL DEFAULT 10,
        "vip_rows" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_screens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_screens_cinema" FOREIGN KEY ("cinema_id") REFERENCES "cinemas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "movies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "title" character varying NOT NULL,
        "poster_url" character varying,
        "genre" text NOT NULL,
        "language" character varying NOT NULL,
        "duration" character varying NOT NULL,
        "rating" numeric(3,1) NOT NULL DEFAULT 0,
        "age_rating" character varying NOT NULL,
        "release_date" date NOT NULL,
        "description" text NOT NULL,
        "cast" text NOT NULL,
        "director" character varying NOT NULL,
        "status" "movies_status_enum" NOT NULL DEFAULT 'now-showing',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_movies_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_movies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "showtimes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "movie_id" uuid NOT NULL,
        "screen_id" uuid NOT NULL,
        "show_date" date NOT NULL,
        "start_time" character varying NOT NULL,
        "price_standard" integer NOT NULL,
        "price_vip" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_showtimes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_showtimes_slot" UNIQUE ("movie_id", "screen_id", "show_date", "start_time"),
        CONSTRAINT "FK_showtimes_movie" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_showtimes_screen" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_code" character varying NOT NULL,
        "user_id" uuid NOT NULL,
        "showtime_id" uuid NOT NULL,
        "seats" text NOT NULL,
        "total" integer NOT NULL,
        "status" "bookings_status_enum" NOT NULL DEFAULT 'confirmed',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_bookings_code" UNIQUE ("booking_code"),
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bookings_showtime" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "showtimes"`);
    await queryRunner.query(`DROP TABLE "movies"`);
    await queryRunner.query(`DROP TABLE "screens"`);
    await queryRunner.query(`DROP TABLE "cinemas"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE "movies_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
