import { useState, useEffect, useCallback } from 'react';

export function useGyroscope() {
  const [permissionGranted, setPermissionGranted] = useState(
    localStorage.getItem('gyro_permission') === 'granted'
  );
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });

  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          localStorage.setItem('gyro_permission', 'granted');
        } else {
          setPermissionGranted(false);
          localStorage.setItem('gyro_permission', 'denied');
        }
      } catch (error) {
        console.error('Error requesting gyroscope permission:', error);
      }
    } else {
      // Non-iOS 13+ devices, or no gyroscope available
      setPermissionGranted(true);
      localStorage.setItem('gyro_permission', 'granted');
    }
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    const handleOrientation = (event) => {
      // beta: front-to-back tilt in degrees, where front is positive
      // gamma: left-to-right tilt in degrees, where right is positive
      setOrientation({
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [permissionGranted]);

  return { permissionGranted, requestPermission, orientation };
}
