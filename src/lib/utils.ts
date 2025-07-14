import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function animateFlyToCart(startEl: HTMLElement, endEl: HTMLElement) {
  const startImg = startEl.querySelector('img');
  if (!startImg) return;

  const startRect = startImg.getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();

  const clone = startImg.cloneNode(true) as HTMLImageElement;

  clone.style.position = 'fixed';
  clone.style.top = `${startRect.top}px`;
  clone.style.left = `${startRect.left}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.objectFit = 'cover';
  clone.style.zIndex = '9999';
  clone.style.borderRadius = '0.5rem';
  clone.style.transition = 'all 800ms cubic-bezier(0.5, 0, 0.75, 0)';
  clone.style.pointerEvents = 'none';

  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    clone.style.top = `${endRect.top + endRect.height / 2 - 10}px`;
    clone.style.left = `${endRect.left + endRect.width / 2 - 10}px`;
    clone.style.width = '20px';
    clone.style.height = '20px';
    clone.style.opacity = '0';
    clone.style.transform = 'scale(0.2)';
  });
  
  clone.addEventListener('transitionend', () => {
    clone.remove();
    endEl.classList.add('animate-bounce-cart');
    setTimeout(() => {
      endEl.classList.remove('animate-bounce-cart');
    }, 600);
  });
}
