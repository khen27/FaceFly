import { Dimensions } from 'react-native';

export const GRAVITY = 1.2;
export const JUMP_FORCE = -15;
export const BIRD_SIZE = 40;
export const PIPE_WIDTH = 60;
export const PIPE_GAP = 200;
export const PIPE_SPEED = 3;
export const SPAWN_INTERVAL = 1500; // ms
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').width;

// Game states
export const GAME_STATES = {
    READY: 'ready',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
} as const;

// Colors
export const COLORS = {
    BIRD: '#e74c3c',
    PIPE: '#00C853',
    BACKGROUND: '#87CEEB',
    TEXT: '#FFFFFF',
    GAME_OVER_BG: 'rgba(0, 0, 0, 0.75)',
} as const;

// Physics
export const BIRD_ROTATION_FACTOR = 0.1;
export const MIN_PIPE_HEIGHT = 50;
export const MAX_PIPE_HEIGHT = SCREEN_HEIGHT - PIPE_GAP - MIN_PIPE_HEIGHT;

export const WINDOW_HEIGHT = Dimensions.get('window').height;
export const WINDOW_WIDTH = Dimensions.get('window').width;

export const BIRD_START_X = WINDOW_WIDTH / 4;
export const BIRD_START_Y = WINDOW_HEIGHT / 2;

export const GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS 