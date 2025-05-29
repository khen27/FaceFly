import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game settings
export const GRAVITY = 0.6;
export const JUMP_FORCE = -10;
export const BIRD_SIZE = 40;
export const PIPE_WIDTH = 60;
export const PIPE_GAP = 160;
export const PIPE_SPEED = 2;
export const SPAWN_INTERVAL = 2000;

// Screen dimensions
export { SCREEN_HEIGHT, SCREEN_WIDTH };

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
export const MIN_PIPE_HEIGHT = 100;
export const MAX_PIPE_HEIGHT = SCREEN_HEIGHT - PIPE_GAP - MIN_PIPE_HEIGHT;

// Game States
export const GAME_STATES = {
    READY: 'READY',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
} as const;

export const WINDOW_HEIGHT = Dimensions.get('window').height;
export const WINDOW_WIDTH = Dimensions.get('window').width;

export const BIRD_START_X = WINDOW_WIDTH / 4;
export const BIRD_START_Y = WINDOW_HEIGHT / 2;

export const GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS 