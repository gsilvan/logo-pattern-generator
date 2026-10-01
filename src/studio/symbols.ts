const paths: Record<string, string> = {
  '♡': '<path d="M12 21C9 18 2 13 2 7a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-7 11-10 14Z" fill="none" stroke="#27303d" stroke-width="1.5"/>',
  '✿': '<g fill="#27303d"><ellipse cx="12" cy="6" rx="3" ry="5"/><ellipse cx="12" cy="6" rx="3" ry="5" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6" rx="3" ry="5" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6" rx="3" ry="5" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6" rx="3" ry="5" transform="rotate(288 12 12)"/><circle cx="12" cy="12" r="3" fill="white"/></g>',
  '✓': '<path d="m3 12 6 6L21 5" fill="none" stroke="#27303d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  '♻': '<g fill="#27303d"><path id="arrow" d="m9 2 4 0 4 7 2-1-1 6-6-2 2-1-3-5-2 3-3-2Z"/><path d="m9 2 4 0 4 7 2-1-1 6-6-2 2-1-3-5-2 3-3-2Z" transform="rotate(120 12 12)"/><path d="m9 2 4 0 4 7 2-1-1 6-6-2 2-1-3-5-2 3-3-2Z" transform="rotate(240 12 12)"/></g>',
};
export function symbolData(symbol: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${paths[symbol]}</svg>`)}`;
}
