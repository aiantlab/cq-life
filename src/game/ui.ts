import type { GameState } from './types';
import { formatClock } from './systems';

export class HUD {
  private hunger = document.getElementById('hunger') as HTMLElement;
  private energy = document.getElementById('energy') as HTMLElement;
  private cash = document.getElementById('cash') as HTMLElement;
  private clock = document.getElementById('clock') as HTMLElement;
  private prompt = document.getElementById('prompt') as HTMLElement;
  private toast = document.getElementById('toast') as HTMLElement;
  private title = document.getElementById('title') as HTMLElement;
  private toastTimer = 0;

  hideTitle() {
    this.title.classList.add('hidden');
  }

  update(state: GameState, dt: number) {
    this.clock.textContent = formatClock(state.gameHour);
    this.setBar(this.hunger, state.needs.hunger);
    this.setBar(this.energy, state.needs.energy);
    this.cash.textContent = `¥${Math.floor(state.needs.cash)}`;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.add('hidden');
    }
  }

  private setBar(el: HTMLElement, v: number) {
    el.style.width = `${Math.max(0, Math.min(100, v))}%`;
    el.classList.toggle('low', v < 28);
  }

  setPrompt(text: string | null) {
    if (!text) {
      this.prompt.classList.add('hidden');
      this.prompt.textContent = '';
      return;
    }
    this.prompt.textContent = text;
    this.prompt.classList.remove('hidden');
  }

  showToast(text: string, seconds = 2.4) {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    this.toastTimer = seconds;
  }
}
