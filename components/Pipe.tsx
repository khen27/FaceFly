import Matter from 'matter-js';
import React from 'react';
import { Image, View } from 'react-native';

type PipeProps = {
    body: Matter.Body;
    color?: string;
};

const Pipe: React.FC<PipeProps> = ({ body }) => {
    const width = body.bounds.max.x - body.bounds.min.x;
    const height = body.bounds.max.y - body.bounds.min.y;
    const xPos = body.position.x - width / 2;
    const yPos = body.position.y - height / 2;

    return (
        <View
            style={{
                position: 'absolute',
                left: xPos,
                top: yPos,
                width: width,
                height: height,
            }}
        >
            <Image
                source={require('../assets/pipe-red.png')}
                style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'stretch',
                }}
            />
        </View>
    );
};

export default Pipe; 