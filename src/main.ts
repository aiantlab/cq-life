import './style.css';
import { Game } from './game/Game';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
  const game = new Game(canvas);
  startBtn.disabled = true;
  startBtn.textContent = '加载物理引擎…';
  try {
    await game.init();
    startBtn.disabled = false;
    startBtn.textContent = '开始一天';
  } catch (err) {
    console.error(err);
    startBtn.textContent = '加载失败，请刷新';
    return;
  }
  startBtn.addEventListener('click', () => game.start());
}

boot();
