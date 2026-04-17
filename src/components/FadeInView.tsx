import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type ViewProps } from 'react-native';

type Props = ViewProps & {
  children: ReactNode;
  delayMs?: number;
};

export function FadeInView({ children, delayMs = 0, style, ...rest }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: delayMs,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: delayMs,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delayMs, opacity, translateY]);

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
