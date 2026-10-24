class Controller {
  constructor() {
    for (let prototipo = Object.getPrototypeOf(this); prototipo !== Object.prototype; prototipo = Object.getPrototypeOf(prototipo)) {
      for (const nome of Object.getOwnPropertyNames(prototipo)) {
        if (nome !== 'constructor' && typeof this[nome] === 'function' && !Object.hasOwn(this, nome)) {
          this[nome] = this[nome].bind(this);
        }
      }
    }
  }
}

module.exports = Controller;
