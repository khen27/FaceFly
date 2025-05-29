import Matter from 'matter-js';
import React, { useEffect } from 'react';
import { Dimensions, Image, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type PipeProps = {
    body: Matter.Body & { isTop?: boolean };
};

const Pipe: React.FC<PipeProps> = ({ body }) => {
    const width = body.bounds.max.x - body.bounds.min.x;
    const height = body.bounds.max.y - body.bounds.min.y;
    const xPos = body.position.x - width / 2;
    const yPos = body.position.y - height / 2;

    useEffect(() => {
        // Log comprehensive pipe information
        console.log('=== Pipe Component Debug ===');
        console.log('Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        console.log('Pipe position:', { xPos, yPos });
        console.log('Pipe dimensions:', { width, height });
        console.log('Body position:', body.position);
        console.log('Body bounds:', body.bounds);
        console.log('Is top pipe:', body.isTop);
        console.log('========================');
    }, []);

    // Log every render
    console.log(`Rendering pipe: ${body.isTop ? 'top' : 'bottom'} at (${xPos}, ${yPos})`);

    return (
        <View
            style={{
                position: 'absolute',
                left: xPos,
                top: yPos,
                width: width,
                height: height,
                zIndex: 10, // Keep pipes above other elements
                elevation: 10, // For Android
            }}
        >
            <Image
                source={require('../assets/pipe-red.png')}
                style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'stretch',
                    transform: [{ scaleY: body.isTop ? -1 : 1 }]
                }}
                onError={(error) => console.error('Pipe image failed to load:', error.nativeEvent.error)}
                onLoad={() => console.log(`Pipe image loaded successfully for ${body.isTop ? 'top' : 'bottom'} pipe`)}
            />
        </View>
    );
};

export default Pipe; 