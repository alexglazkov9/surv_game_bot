import { IUpdatable } from "./IUpdatable";
import { logger } from "../utils/logger";

export class Engine {
  _lastFrameTime: number = Date.now();
  _running = true;
  _deltas: number[] = [];
  _step: number = 30;
  _systems: IUpdatable[] = [];
  _timeout?: NodeJS.Timeout;

  start = () => {
    const _tick = () => {
      this._update();

      const now = Date.now();
      const delta = now - this._lastFrameTime;
      this._lastFrameTime = now;
      if (this._deltas.length > 5) {
        this._deltas.shift();
      }
      this._deltas.push(delta);
      const average =
        this._deltas.reduce((sum, a) => {
          return sum + a;
        }, 0) / (this._deltas.length || 1);
      const drift = average * 1.05 - this._step;

      this._timeout = setTimeout(_tick.bind(this), this._step - drift);
    };

    this._timeout = setTimeout(_tick.bind(this), this._step);
  };

  stop = () => {
    this._running = false;
  };

  Add(system: IUpdatable) {
    this._systems.push(system);
  }

  Remove(system: IUpdatable) {
    this._systems.splice(this._systems.indexOf(system), 1);
  }

  _update = () => {
    if (this._running) {
      this._systems.forEach((system) => {
        system._update(this._step);
      });
    }
  };

  dispose() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }
  // TODO: Dispose???
}
