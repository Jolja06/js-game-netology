'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(multiplier) {
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        this.pos = pos;
        this.size = size;
        this.speed = speed;

        if (!(this.pos instanceof Vector) || !(this.size instanceof Vector) || !(this.speed instanceof Vector)) {
            throw new Error ('Один из переданных аргументов не является типом Vector');
        }
    }

    act() {}

    get left() {
        return this.pos.x;
    }

    get top() {
        return this.pos.y;
    }

    get right() {
        return (this.pos.x + this.size.x);
    }

    get bottom() {
        return (this.pos.y + this.size.y);
    }

    get type() {
        return 'actor';
    }

    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Вы передали объект не типа Actor')
        }

        if (actor === this) {
           return false;
        }

        return ((this.right > actor.left && actor.right > this.left) && (this.bottom > actor.top && actor.bottom > this.top));
    }

}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = actors.find(element => element.type === 'player');
        this.height = grid.length;
        this.width = grid.length ? Math.max(...grid.map(row => row.length)) : 0;
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return (this.status !== null && this.finishDelay < 0);
    }

    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Вы передали объект не типа Actor');
        }
        return this.actors.find(element => element.isIntersect(actor));
    }

    obstacleAt(target, size) {
        if (!(target instanceof Vector) || !(size instanceof Vector)) {
            throw new Error('Вы передали объект не типа Vector');
        }

        const moveActor = new Actor(target, size);

        if (moveActor.bottom > this.height) {
            return 'lava';
        }

        if (moveActor.top < 0 || moveActor.left < 0 || moveActor.right > this.width) {
            return 'wall';
        }

        for (let x = Math.floor(moveActor.left); x < Math.ceil(moveActor.right); x++) {
            for (let y = Math.floor(moveActor.top); y < Math.ceil(moveActor.bottom); y++) {
                const obstacle = this.grid[y][x];
                if (obstacle !== undefined) {
                    return obstacle;
                }
            }
        }

        return undefined;
    }

    removeActor(actor) {
        this.actors = this.actors.filter(item => item !== actor);
    }

    noMoreActors(type) {
         return !(this.actors.some(item => item.type === type));
    }

    playerTouched(type, actor) {
        switch (type) {
            case 'coin':
                this.removeActor(actor);
                if (this.noMoreActors('coin')) {
                    this.status = 'won';
                }
                break;
            case 'fireball':
            case 'lava':
                this.status = 'lost';
                break;
            default:
                return false;
        }
    }
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }

    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }

    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case 'x':
                return 'wall';
            case '!':
                return 'lava';
            default:
                return undefined;
        }
    }

    createGrid(plan = []) {
        return plan.map(row => [...row].map(this.obstacleFromSymbol));
    }

    createActors(plan = []) {
        const actors = [];

        plan.forEach((row, rowIndex) => {
            [...row].forEach((cell, cellIndex) => {
                const NewActor = this.actorFromSymbol(cell);

                if (NewActor && (NewActor.prototype instanceof Actor || NewActor === Actor)) {
                    actors.push(new NewActor(new Vector(cellIndex, rowIndex)));
                }
            });
        });

        return actors;
    }

    parse(plan = []) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, undefined, speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        const nextPosition = this.getNextPosition(time);
        if (level.obstacleAt(nextPosition, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = nextPosition;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 3));
        this.start = this.pos;
    }

    handleObstacle() {
        this.pos = this.start;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
        this.basePos = pos.plus(new Vector(0.2, 0.1));
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.basePos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }

    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain,
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then(schemes => runGame(JSON.parse(schemes), parser, DOMDisplay))
    .then(() => alert('Вы выиграли приз!'));
