import { registerRootComponent } from 'expo';
import * as FileSystem from 'expo-file-system';
import Matter from 'matter-js';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { GameEngine } from 'react-native-game-engine';

import Bird from './components/Bird';
import Pipe from './components/Pipe';
import { COLORS, GAME_STATES, SCREEN_WIDTH, SPAWN_INTERVAL } from './game/constants';
import { createBird, createPipe, GameEntities, moveBird, Physics, setupWorld } from './game/physics';

// Extend Matter.Body type to include our custom properties
declare module 'matter-js' {
    interface Body {
        scored?: boolean;
    }
}

// Add KeyboardEvent type for simulator
declare global {
    interface Window {
        addEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
        removeEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
    }
}

type GameStateType = typeof GAME_STATES[keyof typeof GAME_STATES];

function App() {
    const [gameState, setGameState] = useState<GameStateType>(GAME_STATES.READY);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);

    // Load high score on mount
    useEffect(() => {
        loadHighScore();
    }, []);

    // Add keyboard controls for simulator
    useEffect(() => {
        if (__DEV__ && Platform.OS === 'ios') {
            const handleKeyboardShow = (event: KeyboardEvent) => {
                // Space key press simulation for development
                if (gameState === GAME_STATES.READY) {
                    startGame();
                    moveBird(bird);
                }
                if (gameState === GAME_STATES.PLAYING) {
                    moveBird(bird);
                }
            };

            const keyboardShowListener = Keyboard.addListener('keyboardWillShow', handleKeyboardShow);

            return () => {
                keyboardShowListener.remove();
            };
        }
    }, [gameState]);

    const getStorageDirectory = async () => {
        try {
            const dir = FileSystem.documentDirectory;
            if (!dir) {
                console.warn('Document directory not available');
                return null;
            }
            return dir;
        } catch (error) {
            console.warn('Error accessing document directory:', error);
            return null;
        }
    };

    const loadHighScore = async () => {
        try {
            const dir = await getStorageDirectory();
            if (!dir) return;
            
            const filePath = `${dir}highscore.txt`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (!fileInfo.exists) {
                await FileSystem.writeAsStringAsync(filePath, '0');
                return;
            }
            
            const savedHighScore = await FileSystem.readAsStringAsync(filePath);
            if (savedHighScore) {
                setHighScore(parseInt(savedHighScore, 10));
            }
        } catch (error) {
            console.warn('Error loading high score:', error);
            setHighScore(0);
        }
    };

    const saveHighScore = async (newHighScore: number) => {
        try {
            const dir = await getStorageDirectory();
            if (!dir) return;
            
            const filePath = `${dir}highscore.txt`;
            await FileSystem.writeAsStringAsync(filePath, newHighScore.toString());
        } catch (error) {
            console.warn('Error saving high score:', error);
        }
    };

    // Initialize game
    const engine = setupWorld();
    const bird = createBird();
    Matter.World.add(engine.world, [bird]);

    const entities: GameEntities = {
        physics: { engine, world: engine.world },
        bird: {
            body: bird,
            size: 40,
            renderer: Bird,
        },
        pipes: [],
        score: {
            value: 0,
            highScore: highScore,
        },
        gameState: {
            current: gameState,
        },
    };

    // Game systems
    const onEvent = (e: { type: string }) => {
        if (e.type === 'game-over') {
            setGameState(GAME_STATES.GAME_OVER);
            if (score > highScore) {
                setHighScore(score);
                saveHighScore(score);
            }
            setTimeout(() => {
                resetGame();
            }, 1500);
        }
    };

    const resetGame = () => {
        setGameState(GAME_STATES.READY);
        setScore(0);
        Matter.Body.setPosition(bird, { x: SCREEN_WIDTH / 4, y: 300 });
        Matter.Body.setVelocity(bird, { x: 0, y: 0 });
        Matter.Body.setAngle(bird, 0);
        entities.pipes = [];
    };

    const startGame = () => {
        if (gameState !== GAME_STATES.PLAYING) {
            setGameState(GAME_STATES.PLAYING);
        }
    };

    // Pipe spawning system
    const SpawnPipes = (entities: GameEntities, { time }: { time: { delta: number, current: number, previous: number } }) => {
        if (gameState === GAME_STATES.PLAYING && time.current - (time.previous || 0) > SPAWN_INTERVAL) {
            const { top, bottom } = createPipe(SCREEN_WIDTH + 100);
            Matter.World.add(engine.world, [top, bottom]);
            entities.pipes.push(
                { body: top, renderer: Pipe },
                { body: bottom, renderer: Pipe }
            );
        }
        return entities;
    };

    // Scoring system
    const ScoreSystem = (entities: GameEntities) => {
        if (gameState === GAME_STATES.PLAYING) {
            entities.pipes.forEach(pipe => {
                if (pipe.body.position.x + 60 < SCREEN_WIDTH / 4 && !pipe.body.scored) {
                    pipe.body.scored = true;
                    setScore(prev => prev + 1);
                }
            });
        }
        return entities;
    };

    return (
        <TouchableWithoutFeedback onPress={() => {
            if (gameState === GAME_STATES.READY) {
                startGame();
                moveBird(bird);
            }
            if (gameState === GAME_STATES.PLAYING) {
                moveBird(bird);
            }
        }}>
            <View style={styles.container}>
                <GameEngine
                    ref={(ref) => setGameEngine(ref)}
                    style={styles.gameContainer}
                    systems={[Physics, SpawnPipes, ScoreSystem]}
                    entities={entities}
                    onEvent={onEvent}
                    running={gameState === GAME_STATES.PLAYING}
                />
                
                {gameState === GAME_STATES.READY && (
                    <View style={styles.readyContainer}>
                        <Text style={[styles.readyText, styles.textShadow]}>
                            {__DEV__ && Platform.OS === 'ios' ? 'Tap or Press Space to Start' : 'Tap to Start'}
                        </Text>
                    </View>
                )}

                {gameState === GAME_STATES.PLAYING && (
                    <Text style={[styles.scoreText, styles.textShadow]}>{score}</Text>
                )}

                {gameState === GAME_STATES.GAME_OVER && (
                    <View style={styles.gameOverContainer}>
                        <Text style={[styles.gameOverText, styles.textShadow]}>Game Over</Text>
                        <Text style={[styles.scoreText, styles.textShadow]}>Score: {score}</Text>
                        <Text style={[styles.highScoreText, styles.textShadow]}>High Score: {highScore}</Text>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    gameContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    readyContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    readyText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
    scoreText: {
        position: 'absolute',
        top: 50,
        width: '100%',
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
    gameOverContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.GAME_OVER_BG,
    },
    gameOverText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.TEXT,
        marginBottom: 20,
    },
    highScoreText: {
        fontSize: 24,
        color: COLORS.TEXT,
        marginTop: 10,
    },
    textShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 2,
    },
});

registerRootComponent(App); 