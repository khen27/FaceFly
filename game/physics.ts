import Matter from 'matter-js';
import {
    BIRD_ROTATION_FACTOR,
    BIRD_SIZE,
    GRAVITY,
    JUMP_FORCE,
    MAX_PIPE_HEIGHT,
    MIN_PIPE_HEIGHT,
    PIPE_GAP,
    PIPE_SPEED,
    PIPE_WIDTH,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
} from './constants';

// Types
export type GameEntities = {
    physics: {
        engine: Matter.Engine;
        world: Matter.World;
    };
    bird: {
        body: Matter.Body;
        size: number;
        color?: string;
        renderer: React.FC<any>;
    };
    pipes: Array<{
        body: Matter.Body;
        color?: string;
        renderer: React.FC<any>;
    }>;
    score: {
        value: number;
        highScore: number;
    };
    gameState: {
        current: string;
    };
};

// Physics setup
export const setupWorld = (): Matter.Engine => {
    const engine = Matter.Engine.create({
        enableSleeping: false,
        gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    });
    return engine;
};

// Bird creation
export const createBird = (): Matter.Body => {
    return Matter.Bodies.circle(
        SCREEN_WIDTH / 4,
        SCREEN_HEIGHT / 2,
        BIRD_SIZE / 2,
        {
            label: 'Bird',
            restitution: 0,
            friction: 1,
            density: 0.001,
        }
    );
};

// Pipe creation
export const createPipe = (x: number): { top: Matter.Body; bottom: Matter.Body } => {
    const gapPosition = Math.random() * (MAX_PIPE_HEIGHT - MIN_PIPE_HEIGHT) + MIN_PIPE_HEIGHT;
    
    const topPipe = Matter.Bodies.rectangle(
        x,
        gapPosition - PIPE_GAP / 2,
        PIPE_WIDTH,
        gapPosition,
        { isStatic: true, label: 'Pipe' }
    );

    const bottomPipe = Matter.Bodies.rectangle(
        x,
        gapPosition + PIPE_GAP / 2 + (SCREEN_HEIGHT - gapPosition - PIPE_GAP / 2) / 2,
        PIPE_WIDTH,
        SCREEN_HEIGHT - gapPosition - PIPE_GAP / 2,
        { isStatic: true, label: 'Pipe' }
    );

    return { top: topPipe, bottom: bottomPipe };
};

// Game systems
export const Physics = (entities: GameEntities, { time, dispatch }: { time: { delta: number }, dispatch: (event: { type: string }) => void }) => {
    const engine = entities.physics.engine;
    // Cap delta time at 16.667ms (60 FPS)
    const cappedDelta = Math.min(time.delta, 16.667);
    Matter.Engine.update(engine, cappedDelta);

    // Update bird rotation based on velocity
    const bird = entities.bird.body;
    const rotation = bird.velocity.y * BIRD_ROTATION_FACTOR;
    Matter.Body.setAngle(bird, rotation);

    // Move pipes left
    entities.pipes.forEach(pipe => {
        Matter.Body.translate(pipe.body, { x: -PIPE_SPEED, y: 0 });
    });

    // Remove off-screen pipes
    entities.pipes = entities.pipes.filter(pipe => pipe.body.position.x > -PIPE_WIDTH);

    // Check collisions
    const collisions = Matter.Query.collides(bird, entities.pipes.map(pipe => pipe.body));
    if (collisions.length > 0) {
        dispatch({ type: 'game-over' });
    }

    // Check if bird is out of bounds
    if (bird.position.y > SCREEN_HEIGHT || bird.position.y < 0) {
        dispatch({ type: 'game-over' });
    }

    return entities;
};

// Bird movement
export const moveBird = (body: Matter.Body) => {
    Matter.Body.setVelocity(body, {
        x: 0,
        y: JUMP_FORCE,
    });
    Matter.Body.setAngle(body, -0.5); // Slight upward rotation on jump
}; 