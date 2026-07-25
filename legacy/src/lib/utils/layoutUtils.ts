import type { PaneNode, SplitContainer } from '../types/workspace';

export interface PaneRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tree yapısından tüm terminal'lerin görsel rect'lerini hesapla
 */
export function calculatePaneRects(
  node: PaneNode,
  containerRect: { x: number; y: number; width: number; height: number }
): PaneRect[] {
  if (node.type === 'terminal') {
    return [{
      id: node.id,
      x: containerRect.x,
      y: containerRect.y,
      width: containerRect.width,
      height: containerRect.height
    }];
  }

  if (node.type === 'git') {
    return [];
  }

  // Split container
  const rects: PaneRect[] = [];
  let offset = 0;

  node.children.forEach((child, i) => {
    const size = node.sizes[i] / 100;

    let childRect: { x: number; y: number; width: number; height: number };

    if (node.direction === 'horizontal') {
      const childWidth = containerRect.width * size;
      childRect = {
        x: containerRect.x + offset,
        y: containerRect.y,
        width: childWidth,
        height: containerRect.height
      };
      offset += childWidth;
    } else {
      const childHeight = containerRect.height * size;
      childRect = {
        x: containerRect.x,
        y: containerRect.y + offset,
        width: containerRect.width,
        height: childHeight
      };
      offset += childHeight;
    }

    rects.push(...calculatePaneRects(child, childRect));
  });

  return rects;
}

/**
 * İki rect'in belirli eksende overlap yüzdesini hesapla
 */
function calculateOverlap(
  rect1: PaneRect,
  rect2: PaneRect,
  axis: 'x' | 'y'
): number {
  if (axis === 'x') {
    const start = Math.max(rect1.x, rect2.x);
    const end = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const overlap = Math.max(0, end - start);
    const minWidth = Math.min(rect1.width, rect2.width);
    return minWidth > 0 ? overlap / minWidth : 0;
  } else {
    const start = Math.max(rect1.y, rect2.y);
    const end = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    const overlap = Math.max(0, end - start);
    const minHeight = Math.min(rect1.height, rect2.height);
    return minHeight > 0 ? overlap / minHeight : 0;
  }
}

/**
 * İki rect arası mesafeyi hesapla (belirli yönde)
 */
function calculateDistance(
  from: PaneRect,
  to: PaneRect,
  direction: 'left' | 'right' | 'up' | 'down'
): number {
  switch (direction) {
    case 'left':
      return from.x - (to.x + to.width);
    case 'right':
      return to.x - (from.x + from.width);
    case 'up':
      return from.y - (to.y + to.height);
    case 'down':
      return to.y - (from.y + from.height);
  }
}

/**
 * Belirli yönde en yakın komşu paneli bul
 */
export function findAdjacentPane(
  currentId: string,
  direction: 'left' | 'right' | 'up' | 'down',
  rects: PaneRect[]
): string | null {
  const currentRect = rects.find(r => r.id === currentId);
  if (!currentRect) return null;

  const overlapAxis = direction === 'left' || direction === 'right' ? 'y' : 'x';
  const minOverlap = 0.1; // En az %10 overlap gerekli

  let bestCandidate: { id: string; distance: number } | null = null;

  for (const rect of rects) {
    if (rect.id === currentId) continue;

    // Mesafeyi hesapla
    const distance = calculateDistance(currentRect, rect, direction);

    // Sadece doğru yöndeki panelleri değerlendir (mesafe > 0 veya bitişik)
    if (distance < -1) continue; // Yanlış yönde

    // Overlap kontrolü
    const overlap = calculateOverlap(currentRect, rect, overlapAxis);
    if (overlap < minOverlap) continue;

    // En yakın olanı seç
    if (!bestCandidate || distance < bestCandidate.distance) {
      bestCandidate = { id: rect.id, distance };
    }
  }

  return bestCandidate?.id || null;
}

/**
 * Tüm terminal ID'lerini topla
 */
export function collectAllTerminalIds(node: PaneNode): string[] {
  if (node.type === 'terminal') {
    return [node.id];
  }
  if (node.type === 'git') {
    return [];
  }
  return node.children.flatMap(child => collectAllTerminalIds(child));
}
