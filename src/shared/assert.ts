import { AppError } from '../middlewares/errorHandler';

// Confirms a resource exists (and, since the finder is expected to filter by
// userId, that it belongs to the caller) before a caller inspects its state
// for a more specific error — keeps "doesn't exist" and "not yours" collapsed
// into one generic 404, while still allowing an accurate message once
// ownership is established (nothing left to hide once you already own it).
export async function findOrThrow<T>(
  finder: () => Promise<T | null>,
  notFoundMessage: string,
): Promise<T> {
  const resource = await finder();
  if (!resource) {
    throw new AppError(notFoundMessage, 404);
  }
  return resource;
}
