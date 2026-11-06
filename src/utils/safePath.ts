import path from 'path';

// Resolves parts under base, or returns null if the result would leave base.
export const resolveInside = (base: string, ...parts: unknown[]): string | null => {
    if (parts.some((part) => typeof part !== 'string' || part.includes('\0'))) return null;
    const relative = (parts as string[]).map((part) => part.replace(/^[/\\]+/, ''));
    const root = path.resolve(base);
    const full = path.resolve(root, ...relative);
    return full === root || full.startsWith(root + path.sep) ? full : null;
};

// A plain file name: no directories, no "." or "..".
export const isSafeFileName = (name: unknown): name is string =>
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    name !== '.' &&
    name !== '..' &&
    !/[/\\\0]/.test(name);
