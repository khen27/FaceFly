import Matter from 'matter-js';
import React from 'react';
import { Image, View } from 'react-native';

type BirdProps = {
    body: Matter.Body;
    color?: string;  // Make color optional since we're using an image
    size: number;
};

const Bird: React.FC<BirdProps> = ({ body, size }) => {
    const xPos = body.position.x - size / 2;
    const yPos = body.position.y - size / 2;
    const angle = body.angle;

    return (
        <View
            style={{
                position: 'absolute',
                left: xPos,
                top: yPos,
                width: size,
                height: size,
                transform: [{ rotate: `${angle}rad` }],
            }}
        >
            <Image
                source={require('../assets/flappy-icon.png')}
                style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                }}
            />
        </View>
    );
};

export default Bird; 