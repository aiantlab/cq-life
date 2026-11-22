import type { GameState } from './types';
import { formatClock, dayPhaseLabel } from './systems';

export class HUD {
  private hunger = document.getElementById('hunger') as HTMLElement;
  private energy = document.getElementById('energy') as HTMLElement;
  private cash = document.getElementById('cash') as HTMLElement;
  private clock = document.getElementById('clock') as HTMLElement;
  private prompt = document.getElementById('prompt') as HTMLElement;
  private toast = document.getElementById('toast') as HTMLElement;
  private title = document.getElementById('title') as HTMLElement;
  private toastTimer = 0;
  private lastPrompt = '';
  private lastHungerShown = 100;
  private lastPhase = '';

  hideTitle() {
    this.title.classList.add('hidden');
  }

  update(state: GameState, dt: number) {
    const phase = dayPhaseLabel(state.gameHour);
    this.clock.textContent = `${formatClock(state.gameHour)} · ${phase}`;
    if (phase !== this.lastPhase) {
      if (this.lastPhase) this.showToast(`进入${phase}`, 1.8);
      this.lastPhase = phase;
    }
    this.setBar(this.hunger, state.needs.hunger);
    this.setBar(this.energy, state.needs.energy);
    this.cash.textContent = `¥${Math.floor(state.needs.cash)}`;

    // Noticeable hunger thresholds
    if (state.needs.hunger < 35 && this.lastHungerShown >= 35) {
      this.showToast('有点饿了', 2);
    } else if (state.needs.hunger < 15 && this.lastHungerShown >= 15) {
      this.showToast('非常饿 — 回家吃饭或去便利店', 2.6);
    }
    this.lastHungerShown = state.needs.hunger;

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
      if (this.lastPrompt) {
        this.prompt.classList.add('hidden');
        this.prompt.textContent = '';
        this.lastPrompt = '';
      }
      return;
    }
    if (text !== this.lastPrompt) {
      this.prompt.textContent = text;
      this.prompt.classList.remove('hidden');
      this.prompt.classList.remove('pulse');
      // restart pulse
      void this.prompt.offsetWidth;
      this.prompt.classList.add('pulse');
      this.lastPrompt = text;
    }
  }

  showToast(text: string, seconds = 2.4) {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    this.toastTimer = seconds;
  }
}
