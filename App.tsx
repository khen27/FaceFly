import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import Matter from 'matter-js';
import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, Keyboard, KeyboardEvent, Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { GameEngine } from 'react-native-game-engine';

import Bird from './components/Bird';
import Pipe from './components/Pipe';
import { COLORS, GAME_STATES, PIPE_SPEED, PIPE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH, SPAWN_INTERVAL } from './game/constants';
import { createBird, createPipe, GameEntities, moveBird, Physics, setupBirdVelocityClamping, setupWorld } from './game/physics';

// Extend Matter.Body type to include our custom properties
declare module 'matter-js' {
    interface Body {
        scored?: boolean;
        isTop?: boolean;
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
    const [lastPipeSpawn, setLastPipeSpawn] = useState(0);
    const [entities, setEntities] = useState<GameEntities | null>(null);
    const gameEngineRef = useRef<GameEngine | null>(null);
    const engineRef = useRef<Matter.Engine>(setupWorld());
    const birdRef = useRef<Matter.Body>(createBird());

    // Load high score on mount
    useEffect(() => {
        const initializeGame = async () => {
            try {
                // Initialize AsyncStorage
                const savedScore = await AsyncStorage.getItem('FaceFly:highScore');
                if (savedScore !== null) {
                    setHighScore(parseInt(savedScore, 10));
                }
            } catch (error) {
                // Silently handle storage errors - default to 0
                console.log('Storage not available, using default high score');
            }

            // Create initial entities
            const engine = engineRef.current;
            const bird = birdRef.current;
            Matter.World.add(engine.world, [bird]);
            
            // Setup velocity clamping for Flappy Bird physics
            setupBirdVelocityClamping(engine, bird);
            
            setEntities({
                physics: { engine, world: engine.world },
                bird: {
                    body: bird,
                    size: 40,
                    renderer: Bird,
                },
                pipes: [],
                score: {
                    value: 0,
                    highScore: 0,
                },
                gameState: {
                    current: GAME_STATES.READY,
                },
            });
        };

        initializeGame();
    }, []);

    // Keep highScore in entities in sync
    useEffect(() => {
        if (entities) {
            setEntities({ ...entities, score: { ...entities.score, highScore } });
        }
    }, [highScore]);

    // Add keyboard controls for simulator
    useEffect(() => {
        if (__DEV__ && Platform.OS === 'ios') {
            const handleKeyboardShow = (event: KeyboardEvent) => {
                // Space key press simulation for development
                if (!entities || !entities.bird || !entities.bird.body) return;
                if (gameState === GAME_STATES.READY) {
                    startGame();
                    moveBird(entities.bird.body);
                }
                if (gameState === GAME_STATES.PLAYING) {
                    moveBird(entities.bird.body);
                }
            };

            const keyboardShowListener = Keyboard.addListener('keyboardWillShow', handleKeyboardShow);

            return () => {
                keyboardShowListener.remove();
            };
        }
    }, [gameState, entities]);

    const saveHighScore = async (newHighScore: number) => {
        try {
            await AsyncStorage.setItem('FaceFly:highScore', newHighScore.toString());
        } catch (error) {
            // Silently handle storage errors
            console.log('Unable to save high score');
        }
    };

    const onEvent = (e: { type: string }) => {
        if (e.type === 'game-over') {
            console.log('=== GAME OVER - SHOWING GAME OVER SCREEN ===');
            
            // Set game over state to show the game over screen
            setGameState(GAME_STATES.GAME_OVER);
            
            // Check and save high score
            if (score > highScore) {
                console.log(`New high score! ${score} > ${highScore}`);
                setHighScore(score);
                saveHighScore(score).catch(console.log);
            }
        }
    };

    const handleRestart = () => {
        console.log('=== RESTART BUTTON PRESSED ===');
        resetGame();
    };

    const resetGame = () => {
        console.log('=== STARTING COMPLETE GAME RESET ===');
        
        // Step 1: Clear out old Matter.js world and engine state
        const oldEngine = engineRef.current;
        if (oldEngine && oldEngine.world) {
            console.log('Clearing old Matter.js world and engine...');
            Matter.World.clear(oldEngine.world, false);
            Matter.Engine.clear(oldEngine);
        }
        
        // Step 2: Re-create fresh engine and world instance
        console.log('Creating fresh engine and world...');
        const freshEngine = setupWorld();
        const freshBird = createBird();
        
        // Step 3: Explicitly set bird to original starting position
        console.log('Setting bird to original position...');
        Matter.Body.setPosition(freshBird, { 
            x: SCREEN_WIDTH / 4, 
            y: SCREEN_HEIGHT / 2 
        });
        Matter.Body.setVelocity(freshBird, { x: 0, y: 0 });
        Matter.Body.setAngle(freshBird, 0);
        
        // Update refs to new instances
        engineRef.current = freshEngine;
        birdRef.current = freshBird;
        
        // Step 4: Re-initialize entities at original start coordinates
        console.log('Re-initializing entities at start positions...');
        
        // Add bird to fresh world at initial position
        Matter.World.add(freshEngine.world, [freshBird]);
        
        // Setup physics for the new bird
        setupBirdVelocityClamping(freshEngine, freshBird);
        
        // Step 5: Reset all game-state flags/counters
        console.log('Resetting all game state...');
        setScore(0);
        setGameState(GAME_STATES.READY);
        setLastPipeSpawn(0);
        
        // Step 6: Create completely fresh entities with NO pipes
        console.log('Creating fresh entities with cleared pipes...');
        const freshEntities: GameEntities = {
            physics: { 
                engine: freshEngine, 
                world: freshEngine.world 
            },
            bird: {
                body: freshBird,
                size: 40,
                renderer: Bird,
            },
            pipes: [], // Completely empty - pipes will respawn when game starts
            score: {
                value: 0, // Reset score counter
                highScore: highScore, // Preserve high score
            },
            gameState: {
                current: GAME_STATES.READY, // Reset to ready state
            },
        };
        
        // CRUCIAL: Swap entities in the running GameEngine for a true fresh restart
        (gameEngineRef.current as any)?.swap(freshEntities);
        setEntities(freshEntities);
        
        console.log('=== COMPLETE GAME RESET FINISHED ===');
        console.log('Bird position reset to:', freshBird.position);
        console.log('Bird velocity reset to:', freshBird.velocity);
        console.log('All pipes cleared - count:', freshEntities.pipes.length);
        console.log('Physics world bodies count:', freshEngine.world.bodies.length);
    };

    const startGame = () => {
        console.log('Starting game');
        setGameState(GAME_STATES.PLAYING);
        setLastPipeSpawn(0); // Reset spawn timer
        
        // Update entities game state to match
        if (entities) {
            entities.gameState.current = GAME_STATES.PLAYING;
        }
    };

    // Pipe spawning system
    const SpawnPipes = (entities: GameEntities, { time }: { time: { current: number, delta: number } }) => {
        if (!entities || !gameState || gameState !== GAME_STATES.PLAYING) {
            console.log('SpawnPipes: Not in playing state or entities missing');
            return entities;
        }

        // Debug current state
        console.log('=== SpawnPipes System State ===');
        console.log('Game State:', gameState);
        console.log('Current Pipes:', entities.pipes.length);
        console.log('Physics World Bodies:', entities.physics.engine.world.bodies.length);
        console.log('Time:', { current: time.current, delta: time.delta });
        console.log('Last Spawn:', lastPipeSpawn);
        console.log('============================');

        const currentTime = time.current;
        if (!lastPipeSpawn || currentTime - lastPipeSpawn >= SPAWN_INTERVAL) {
            console.log('Attempting to spawn new pipes');
            
            // Create pipes
            const { top, bottom } = createPipe(SCREEN_WIDTH + PIPE_WIDTH);
            
            // Verify pipe creation
            console.log('Created new pipes:', {
                top: { x: top.position.x, y: top.position.y },
                bottom: { x: bottom.position.x, y: bottom.position.y }
            });
            
            // Add to physics world
            Matter.World.add(entities.physics.engine.world, [top, bottom]);
            
            // Verify physics world addition
            console.log('Physics world bodies after addition:', entities.physics.engine.world.bodies.length);
            
            // Create unique keys for each pipe pair
            const pipeId = Date.now();
            const topPipeKey = `pipe_top_${pipeId}`;
            const bottomPipeKey = `pipe_bottom_${pipeId}`;
            
            // Add pipes as individual entities to the game engine
            entities[topPipeKey] = {
                body: top,
                renderer: Pipe,
            };
            entities[bottomPipeKey] = {
                body: bottom,
                renderer: Pipe,
            };
            
            // Also update our tracking array
            entities.pipes = [
                ...entities.pipes,
                { body: top, renderer: Pipe, isTop: true },
                { body: bottom, renderer: Pipe, isTop: false }
            ];
            
            console.log('Updated pipe entities:', entities.pipes.length);
            console.log('Added entities:', topPipeKey, bottomPipeKey);
            
            setLastPipeSpawn(currentTime);
        }

        // Move existing pipes
        if (entities.pipes.length > 0) {
            const moveAmount = (PIPE_SPEED * time.delta) / 16.667;
            entities.pipes.forEach((pipe, index) => {
                const oldX = pipe.body.position.x;
                Matter.Body.translate(pipe.body, { x: -moveAmount, y: 0 });
                const newX = pipe.body.position.x;
                console.log(`Pipe ${index} moved: ${oldX} -> ${newX}`);
            });
            
            // Clean up pipes that have moved off screen
            const pipeKeysToRemove: string[] = [];
            Object.keys(entities).forEach(key => {
                if (key.startsWith('pipe_') && entities[key].body && entities[key].body.position.x < -PIPE_WIDTH) {
                    console.log('Removing off-screen pipe:', key);
                    Matter.World.remove(entities.physics.engine.world, entities[key].body);
                    pipeKeysToRemove.push(key);
                }
            });
            
            // Remove off-screen pipes from entities
            pipeKeysToRemove.forEach(key => {
                delete entities[key];
            });
            
            // Update tracking array
            entities.pipes = entities.pipes.filter(pipe => pipe.body.position.x > -PIPE_WIDTH);
        }

        return entities;
    };

    // Scoring system
    const ScoreSystem = (entities: GameEntities) => {
        if (gameState === GAME_STATES.PLAYING) {
            const bird = entities.bird.body;
            let newScore = entities.score.value;
            
            // Check if bird has passed any pipes
            entities.pipes.forEach(pipe => {
                // Only check bottom pipes to avoid double counting
                if (!pipe.body.isTop && !pipe.body.scored) {
                    // Check if bird has passed the pipe
                    if (bird.position.x > pipe.body.position.x + PIPE_WIDTH / 2) {
                        pipe.body.scored = true;
                        newScore += 1;
                        console.log('Score increased! New score:', newScore);
                    }
                }
            });
            
            // Update score in entities
            entities.score.value = newScore;
            setScore(newScore);
        }
        return entities;
    };

    // Touch handler always uses the current bird body
    const handleFlap = () => {
        if (!entities || !entities.bird || !entities.bird.body) return;
        if (gameState === GAME_STATES.READY) {
            startGame();
            moveBird(entities.bird.body);
        } else if (gameState === GAME_STATES.PLAYING) {
            moveBird(entities.bird.body);
        }
    };

    useEffect(() => {
        // Log game state changes
        console.log('=== Game State Change ===');
        console.log('Current state:', gameState);
        console.log('Entities:', entities ? Object.keys(entities) : 'none');
        console.log('Pipe count:', entities?.pipes?.length || 0);
        console.log('========================');
    }, [gameState, entities]);

    if (!entities) return null;

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('./assets/background-night.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <GameEngine
                    ref={gameEngineRef}
                    style={[styles.gameContainer, {
                        backgroundColor: 'transparent',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                    }]}
                    systems={[
                        (entities: GameEntities, args: any) => Physics(entities, { ...args, gameState }),
                        SpawnPipes,
                        ScoreSystem
                    ]}
                    entities={entities}
                    onEvent={onEvent}
                    running={gameState === GAME_STATES.PLAYING}
                >
                    <TouchableWithoutFeedback onPress={handleFlap}>
                        <View style={[styles.touchableArea, {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'transparent',
                        }]}>
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
                                    <TouchableWithoutFeedback onPress={handleRestart}>
                                        <View style={styles.restartButton}>
                                            <Text style={[styles.restartButtonText, styles.textShadow]}>Restart</Text>
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </GameEngine>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        position: 'relative',
    },
    gameContainer: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    touchableArea: {
        flex: 1,
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
        zIndex: 1,
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
    textShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 2,
    },
    gameOverContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
    },
    gameOverText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
    highScoreText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
    restartButton: {
        marginTop: 30,
        paddingHorizontal: 30,
        paddingVertical: 15,
        backgroundColor: COLORS.BIRD,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    restartButtonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.TEXT,
    },
});

registerRootComponent(App); 