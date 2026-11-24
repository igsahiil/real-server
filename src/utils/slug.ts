import slugify from 'slugify';
import crypto from 'crypto';

export function generatePropertySlug(title: string, city: string, locality?: string): string {
  const parts = [title, locality, city].filter(Boolean).join(' ');
  const baseSlug = slugify(parts, {
    lower: true,
    strict: true,
    trim: true,
  });

  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${baseSlug}-${randomSuffix}`;
}
