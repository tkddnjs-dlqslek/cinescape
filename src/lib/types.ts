import { z } from "zod";

export const CoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const SceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  note: z.string(),
  coord: CoordSchema,
  stillUrl: z.string().url(),
  nowUrl: z.string().url(),
  bearing: z.number().min(0).max(360),
});

export const FilmSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1888).max(2100),
  director: z.string().min(1),
  tmdbId: z.number().int().nullable(),
  scenes: z.array(SceneSchema).min(1),
});

export const FilmsSchema = z.array(FilmSchema);

export type Coord = z.infer<typeof CoordSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Film = z.infer<typeof FilmSchema>;

export function parseFilms(data: unknown): Film[] {
  return FilmsSchema.parse(data);
}
