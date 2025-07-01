/**
 * GPS Speedometer & Odometer
 * A beautiful and accurate speed tracker for any transportation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, G, Text as SvgText, Line, Circle, Defs, RadialGradient, Stop, Rect, ClipPath, Mask } from 'react-native-svg';

const BG_GRADIENT = ['#1a1c2c', '#23253a', '#23253a'];
const PRIMARY = '#4fd1ff';
const NEEDLE_COLOR = '#ff4d4d';
const NEEDLE_BASE = '#fff';
const TICK_COLOR = '#b0c4de';
const LABEL_COLOR = '#fff';
const DIAL_SHADOW = '#1a1c2c';
const MAX_BUBBLE_BG = 'rgba(60,80,120,0.7)';
const MAX_BUBBLE_BORDER = '#4fd1ff';
const INFO_ICON = '#4fd1ff';
const INFO_TEXT = '#fff';
const AD_BG = '#23253a';
const AD_BORDER = '#4fd1ff';

const { width, height } = Dimensions.get('window');

// Rotate the dial an additional 10 degrees anticlockwise
const DIAL_RADIUS = width * 0.44;
const DIAL_CENTER_X = width / 2;
const DIAL_CENTER_Y = width * 0.54;
const DIAL_START_ANGLE = 205; // was 215
const DIAL_END_ANGLE = 25;   // was 35
const TICK_COUNT = 12; // 0, 20, ..., 220
const TICK_LABELS = Array.from({ length: TICK_COUNT }, (_, i) => i * 20); // 0, 20, ..., 220
const TICK_ANGLES = Array.from({ length: TICK_COUNT }, (_, i) => DIAL_START_ANGLE + (i * (270 / (TICK_COUNT - 1))));

function polarToCartesian(cx, cy, r, angle) {
  const a = (angle - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  };
}

function SpeedometerDial({ speed, maxSpeed }) {
  // Clamp speed for needle
  const clampedSpeed = Math.max(0, Math.min(speed, 220));
  // Needle: 0 at 225°, 220 at 45°
  const angle = DIAL_START_ANGLE + ((clampedSpeed - 0) / 220) * 270;
  const needleLength = DIAL_RADIUS * 0.85; // Made needle much bigger - almost to the edge
  // Needle base at the center of the dial (traditional speedometer style)
  const base = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, 0, DIAL_START_ANGLE); // Start from center
  const tip = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, needleLength, angle);

  // Major ticks (every 20, including 0)
  const majorTicks = TICK_ANGLES;
  // Minor ticks (every 10, including 0)
  const minorTicks = Array.from({ length: 23 }, (_, i) => DIAL_START_ANGLE + (i * (270 / 22)));
  // Remove overlap where major and minor coincide
  const filteredMinorTicks = minorTicks.filter(
    (deg) => !majorTicks.some((maj) => Math.abs(maj - deg) < 1e-3)
  );

  return (
    <View style={{ alignItems: 'center', marginTop: 0 }}>
      <Svg width={width} height={width * 1.1}>
        <Defs>
          {/* Radial gradient for dial background */}
          <RadialGradient id="dialBg" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#31344b" stopOpacity="1" />
            <Stop offset="80%" stopColor="#23253a" stopOpacity="1" />
            <Stop offset="100%" stopColor="#181a28" stopOpacity="1" />
          </RadialGradient>
          {/* Glow for dial edge */}
          <RadialGradient id="dialGlow" cx="50%" cy="50%" r="80%">
            <Stop offset="60%" stopColor="#4fd1ff" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#23253a" stopOpacity="0" />
          </RadialGradient>
          {/* ClipPath for the dial area */}
          <ClipPath id="dialClip">
            <Circle cx={DIAL_CENTER_X} cy={DIAL_CENTER_Y} r={DIAL_RADIUS} />
          </ClipPath>
          {/* ClipPath to show only lower half of needle */}
          <ClipPath id="needleLowerHalf">
            <Rect x="0" y={DIAL_CENTER_Y} width={width} height={width * 0.6} />
          </ClipPath>
        </Defs>
        {/* Dial background as a complete circle */}
        <Circle cx={DIAL_CENTER_X} cy={DIAL_CENTER_Y} r={DIAL_RADIUS} fill="url(#dialBg)" />
        {/* Dial edge glow as a complete circle */}
        <Circle cx={DIAL_CENTER_X} cy={DIAL_CENTER_Y} r={DIAL_RADIUS + 10} fill="url(#dialGlow)" />
        {/* Major ticks */}
        {majorTicks.map((deg, i) => {
          const tickStart = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, DIAL_RADIUS - 18, deg);
          const tickEnd = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, DIAL_RADIUS, deg);
          return (
            <Line
              key={`maj-${deg}`}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.95}
            />
          );
        })}
        {/* Minor ticks */}
        {filteredMinorTicks.map((deg, i) => {
          const tickStart = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, DIAL_RADIUS - 10, deg);
          const tickEnd = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, DIAL_RADIUS, deg);
          return (
            <Line
              key={`min-${deg}`}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="#fff"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.7}
            />
          );
        })}
        {/* Numbers */}
        {majorTicks.map((deg, i) => {
          const label = TICK_LABELS[i];
          const labelPos = polarToCartesian(DIAL_CENTER_X, DIAL_CENTER_Y, DIAL_RADIUS - 38, deg);
          return (
            <SvgText
              key={`label-${deg}`}
              x={labelPos.x}
              y={labelPos.y + 8}
              fontSize="22"
              fill="#fff"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="System"
              opacity={0.92}
            >
              {label}
            </SvgText>
          );
        })}
                          {/* Needle with upper half hidden by shadow effect */}
        <G clipPath="url(#dialClip)">
          {/* Shadow for the visible part of the needle */}
          <Line
            x1={base.x}
            y1={base.y}
            x2={tip.x + 1}
            y2={tip.y + 1}
            stroke="#000"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.15}
          />
          {/* Main needle - only lower half visible */}
          <G clipPath="url(#needleLowerHalf)">
            <Line
              x1={base.x}
              y1={base.y}
              x2={tip.x}
              y2={tip.y}
              stroke={NEEDLE_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </G>
          {/* Shadow overlay to create depth effect on upper half */}
          <Line
            x1={base.x}
            y1={base.y}
            x2={tip.x}
            y2={tip.y}
            stroke="#000"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.6}
          />

        </G>
      </Svg>
      {/* Large speed number (centered, positioned above needle base) */}
      <View style={{ position: 'absolute', top: DIAL_CENTER_Y - 40, left: 0, width: width, alignItems: 'center' }}>
        <Text style={{ fontSize: 68, color: '#fff', fontWeight: 'bold', fontFamily: 'System', textShadowColor: '#000', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 8 }}>{Math.round(speed)}</Text>
        <Text style={{ fontSize: 32, color: PRIMARY, fontWeight: '600', marginTop: -8, fontFamily: 'System', textShadowColor: '#000', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 8 }}>km/h</Text>
      </View>
      {/* Max speed bubble (thinner, softer border) */}
      <View style={{
        position: 'absolute',
        top: DIAL_CENTER_Y + DIAL_RADIUS * 0.5,
        right: width * 0.18,
        backgroundColor: MAX_BUBBLE_BG,
        borderRadius: 56,
        width: 112,
        height: 112,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(79,209,255,0.6)', // softer, semi-transparent
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', fontFamily: 'System' }}>{Math.round(maxSpeed)}</Text>
        <Text style={{ color: PRIMARY, fontSize: 20, fontFamily: 'System' }}>Max.</Text>
      </View>
    </View>
  );
}

function InfoIcon({ type }) {
  // SVG icons for info row
  if (type === 'distance') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M4 20l16-16" stroke={INFO_ICON} strokeWidth={2} />
        <Circle cx={4} cy={20} r={3} fill={INFO_ICON} />
        <Circle cx={20} cy={4} r={3} fill={INFO_ICON} />
      </Svg>
    );
  }
  if (type === 'accuracy') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} stroke={INFO_ICON} strokeWidth={2} fill="none" />
        <Circle cx={12} cy={12} r={4} fill={INFO_ICON} />
      </Svg>
    );
  }
  if (type === 'time') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} stroke={INFO_ICON} strokeWidth={2} fill="none" />
        <Path d="M12 6v6l4 2" stroke={INFO_ICON} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  if (type === 'road') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 2v20M2 12h20" stroke={INFO_ICON} strokeWidth={2} />
        <Circle cx={12} cy={12} r={3} fill={INFO_ICON} />
      </Svg>
    );
  }
  return null;
}

const App = () => {
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [speedUnit, setSpeedUnit] = useState('kmh'); // kmh or mph
  const [distanceUnit, setDistanceUnit] = useState('km'); // km or miles
  const [tripStartTime, setTripStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [currentAltitude, setCurrentAltitude] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('Waiting for GPS...');
  const [isEmulatorMode, setIsEmulatorMode] = useState(false);

  const locationSubscription = useRef(null);
  const speedReadings = useRef([]);
  const lastLocation = useRef(null);
  const timerRef = useRef(null);
  const speedAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const locationHistory = useRef([]);
  const lastSpeedUpdate = useRef(0);
  const emulatorSimulationRef = useRef(null);

  useEffect(() => {
    requestLocationPermission();
    // Check if GPS/location services are enabled
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('GPS/location services are ENABLED. Position:', position);
        startContinuousTracking(); // <-- Always start real tracking
      },
      (error) => {
        console.log('GPS/location services are NOT enabled or not available. Error:', error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    startPulseAnimation();
    return () => {
      if (locationSubscription.current) {
        Geolocation.clearWatch(locationSubscription.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isTracking]);

  useEffect(() => {
    // Animate speed changes
    Animated.timing(speedAnimation, {
      toValue: currentSpeed,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentSpeed]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization('whenInUse');
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location to track your speed.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          Alert.alert('Permission Denied', 'Location permission is required for speed tracking.');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const checkGPSStatus = () => {
    console.log('Checking GPS status...');
    setGpsStatus('Checking GPS...');
    
    // Check if location services are enabled
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('GPS is working:', position);
        console.log('Full GPS data:', {
          speed: position.coords?.speed,
          accuracy: position.coords?.accuracy,
          latitude: position.coords?.latitude,
          longitude: position.coords?.longitude,
          altitude: position.coords?.altitude,
          satellites: position.extras?.satellites,
          timestamp: position.timestamp
        });
        const { speed, coords } = position;
        const accuracy = coords?.accuracy || 0;
        
        setGpsStatus('GPS Working');
        
        Alert.alert(
          'GPS Status',
          'GPS is working correctly!\n' +
          `Speed: ${speed ? (speed * 3.6).toFixed(2) + ' km/h' : '0.00 km/h'}\n` +
          `Accuracy: ${accuracy.toFixed(1)}m\n` +
          `Lat: ${coords.latitude.toFixed(6)}\n` +
          `Lon: ${coords.longitude.toFixed(6)}\n` +
          `Satellites: ${position.extras?.satellites || 'Unknown'}`
        );
      },
      (error) => {
        console.log('GPS check failed:', error);
        console.log('Full error object:', JSON.stringify(error, null, 2));
        let errorMessage = 'Unknown error';
        
        switch (error.code) {
          case 1:
            errorMessage = 'Permission denied - Check app permissions';
            setGpsStatus('Permission Denied');
            break;
          case 2:
            errorMessage = 'Location unavailable - Check GPS settings';
            setGpsStatus('Location Unavailable');
            break;
          case 3:
            errorMessage = 'Timeout - GPS taking too long to respond';
            setGpsStatus('GPS Timeout');
            break;
          default:
            errorMessage = error.message || 'Unknown GPS error';
            setGpsStatus('GPS Error');
        }
        
        Alert.alert(
          'GPS Status',
          `GPS is not working: ${errorMessage}\n\nError Code: ${error.code}\n\nTroubleshooting:\n` +
          (error.code === 3 ? 
            '1. Go outdoors or near a window\n2. Wait 30-60 seconds\n3. Make sure GPS is enabled\n4. Try "Check GPS Status" again' :
            '1. Check location permissions\n2. Enable GPS in settings\n3. Set location mode to "High accuracy"\n4. Go outdoors for better signal'
          ),
          [
            { text: 'OK', style: 'default' },
            { text: 'Try Again', onPress: () => setTimeout(checkGPSStatus, 1000) }
          ]
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 25000, // Increased timeout to 25 seconds
        maximumAge: 0,
      }
    );
  };

  // Improved speed calculation with better movement detection
  const calculateSpeedFromGPS = (position) => {
    const { speed, coords, timestamp } = position;
    
    console.log('GPS Position:', { speed, timestamp, coords }); // Debug log
    console.log('Speed from position.speed:', speed);
    console.log('Speed from coords.speed:', coords?.speed);
    
    // Method 1: Use GPS speed if available and valid (try both locations)
    const gpsSpeed = speed || coords?.speed;
    if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed > 0) {
      console.log('Using GPS speed:', gpsSpeed * 3.6); // Debug log
      return gpsSpeed * 3.6; // Convert m/s to km/h
    }
    
    // Method 2: Calculate speed from position changes (more sensitive)
    if (lastLocation.current && coords) {
      const timeDiff = (timestamp - lastLocation.current.timestamp) / 1000; // seconds
      console.log('Time diff:', timeDiff); // Debug log
      
      if (timeDiff > 0.1 && timeDiff < 15) { // Increased max time difference
        const distance = calculateDistance(
          lastLocation.current.latitude,
          lastLocation.current.longitude,
          coords.latitude,
          coords.longitude
        );
        
        console.log('Calculated distance:', distance); // Debug log
        
        // More sensitive distance thresholds
        if (distance > 0.000005) { // Reduced threshold to 5cm
          const speedKmh = (distance / timeDiff) * 3600; // km/h
          console.log('Calculated speed:', speedKmh); // Debug log
          
          // Accept any reasonable speed calculation
          if (speedKmh > 0 && speedKmh < 300) {
            return speedKmh;
          }
        }
      }
    }
    
    // Method 3: Enhanced minimum speed detection for very slow movement
    if (lastLocation.current && coords) {
      const timeDiff = (timestamp - lastLocation.current.timestamp) / 1000;
      if (timeDiff > 0.3) { // Reduced time threshold to 0.3 seconds
        const distance = calculateDistance(
          lastLocation.current.latitude,
          lastLocation.current.longitude,
          coords.latitude,
          coords.longitude
        );
        
        // Even tiny movements should register some speed
        if (distance > 0.000001) { // Any movement at all (1mm)
          const speedKmh = (distance / timeDiff) * 3600;
          console.log('Minimum speed calculated:', speedKmh);
          return Math.max(speedKmh, 0.05); // Reduced minimum to 0.05 km/h
        }
      }
    }
    
    // Method 4: Check if we've been stationary for too long and clear history
    if (lastLocation.current && coords) {
      const timeDiff = (timestamp - lastLocation.current.timestamp) / 1000;
      if (timeDiff > 5) { // If more than 5 seconds have passed
        // Clear old location to allow fresh start
        console.log('Clearing old location data for fresh start');
        lastLocation.current = null;
      }
    }
    
    console.log('No valid speed calculated'); // Debug log
    return 0;
  };

  // Improved speed smoothing with better zero-speed handling
  const smoothSpeed = (newSpeed) => {
    if (speedReadings.current.length === 0) {
      console.log('First speed reading, using as-is:', newSpeed);
      return newSpeed;
    }
    
    // Get recent speeds for analysis
    const recentSpeeds = speedReadings.current.slice(-5);
    const avgSpeed = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
    
    // Special handling for transitions from 0 to positive speed
    if (avgSpeed === 0 && newSpeed > 0) {
      console.log('Transition from 0 to positive speed, using new speed:', newSpeed);
      // Clear old readings to prevent getting stuck
      speedReadings.current = [];
      return newSpeed;
    }
    
    // Special handling for transitions from positive speed to 0
    if (avgSpeed > 0 && newSpeed === 0) {
      console.log('Transition from positive to 0 speed, using 0');
      return 0;
    }
    
    // If we've been at 0 for a while and get a new positive speed, trust it
    const zeroCount = recentSpeeds.filter(s => s === 0).length;
    if (zeroCount >= 3 && newSpeed > 0) {
      console.log('Been at 0 for a while, accepting new positive speed:', newSpeed);
      // Clear some old readings to allow fresh start
      speedReadings.current = speedReadings.current.slice(-2);
      return newSpeed;
    }
    
    // Outlier detection - but be more lenient for speed changes
    if (avgSpeed > 0 && Math.abs(newSpeed - avgSpeed) > avgSpeed * 4.0) {
      console.log('Speed outlier detected, using average:', avgSpeed);
      return avgSpeed;
    }
    
    // Adaptive smoothing based on speed range
    let weight = 0.6; // Default weight
    
    if (newSpeed === 0) {
      weight = 0.8; // More weight to 0 readings to prevent false positives
    } else if (newSpeed > 50) {
      weight = 0.8; // More weight to high speed readings
    } else if (newSpeed < 5) {
      weight = 0.7; // Moderate weight for low speeds
    }
    
    const smoothedSpeed = (avgSpeed * (1 - weight)) + (newSpeed * weight);
    console.log('Smoothing: avg=', avgSpeed, 'new=', newSpeed, 'weight=', weight, 'result=', smoothedSpeed);
    return smoothedSpeed;
  };

  const startTracking = () => {
    setIsTracking(true);
    setTripStartTime(Date.now());
    setElapsedTime(0);
    setCurrentSpeed(0);
    setMaxSpeed(0);
    setAverageSpeed(0);
    setTotalDistance(0);
    setSpeedHistory([]);
    setGpsStatus('Acquiring GPS signal...');
    speedReadings.current = [];
    locationHistory.current = [];
    lastLocation.current = null;
    lastSpeedUpdate.current = 0;

    console.log('Starting GPS tracking...');
    
    // Check if GPS service is available with more patience
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('GPS service is available, checking if emulator...');
        
        // Check if this looks like an emulator (no satellites, no speed, static location)
        const isEmulator = !position.extras?.satellites || 
                          position.extras.satellites === 0 || 
                          !position.coords.speed || 
                          position.coords.speed === 0;
        
        console.log('isEmulator:', isEmulator, position);
        
        if (isEmulator) {
          console.log('Detected emulator, starting emulator simulation...');
          startEmulatorSimulation();
        } else {
          console.log('Real device detected, starting continuous tracking...');
          startContinuousTracking();
        }
      },
      (error) => {
        console.log('GPS service check failed, assuming emulator:', error);
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        });
        
        // If it's a timeout error, try one more time with longer timeout
        if (error.code === 3) { // TIMEOUT
          console.log('GPS timeout, trying again with longer timeout...');
          setGpsStatus('GPS Timeout - Retrying...');
          
          setTimeout(() => {
            Geolocation.getCurrentPosition(
              (position) => {
                console.log('GPS retry successful:', position);
                startContinuousTracking();
              },
              (retryError) => {
                console.log('GPS retry also failed:', retryError);
                setGpsStatus('GPS Service Unavailable - Using Emulator Mode');
                startEmulatorSimulation();
              },
              {
                enableHighAccuracy: true,
                timeout: 30000, // 30 seconds timeout
                maximumAge: 0,
              }
            );
          }, 2000); // Wait 2 seconds before retry
        } else {
          setGpsStatus('GPS Service Unavailable - Using Emulator Mode');
          startEmulatorSimulation();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Increased to 20 seconds
        maximumAge: 0,
      }
    );
  };

  const startContinuousTracking = () => {
    locationSubscription.current = Geolocation.watchPosition(
      (position) => {
        const { coords, altitude, accuracy, timestamp } = position;
        
        console.log('=== GPS Update received ===');
        console.log('Raw speed from GPS:', coords?.speed || position.speed);
        console.log('Speed from coords:', coords?.speed);
        console.log('Speed in m/s:', coords?.speed || position.speed);
        console.log('Speed in km/h:', (coords?.speed || position.speed) ? (coords?.speed || position.speed) * 3.6 : 'N/A');
        console.log('Accuracy:', accuracy || coords?.accuracy || 'Unknown');
        console.log('Timestamp:', timestamp);
        console.log('Coordinates:', coords);
        console.log('Altitude:', altitude);
        console.log('Satellites:', position.extras?.satellites || 'Unknown');
        console.log('========================');
        
        // Update GPS status
        const currentAccuracy = accuracy || coords?.accuracy || 0;
        if (currentAccuracy < 5) {
          setGpsStatus('Excellent GPS Signal');
        } else if (currentAccuracy < 10) {
          setGpsStatus('Good GPS Signal');
        } else {
          setGpsStatus('Poor GPS Signal');
        }
        
        setCurrentAltitude(altitude || 0);
        setAccuracy(currentAccuracy);

        // Calculate speed using improved method
        let speedInUnit = calculateSpeedFromGPS(position);
        console.log('Raw speed from GPS:', coords?.speed || position.speed);
        console.log('Final calculated speed (before smoothing):', speedInUnit);
        // Apply smoothing
        speedInUnit = smoothSpeed(speedInUnit);
        console.log('After smoothing:', speedInUnit); // Debug log
        // Convert to selected unit
        if (speedUnit === 'mph') {
          speedInUnit = speedInUnit * 0.621371; // km/h to mph
        }
        // Log the final speed that will be set
        console.log('Setting current speed to:', speedInUnit);

        // Update speed if reasonable (removed accuracy restriction)
        if (speedInUnit >= 0 && speedInUnit < 300) {
          console.log('Setting current speed to:', speedInUnit);
          setCurrentSpeed(speedInUnit);
          
          // Update max speed
          if (speedInUnit > maxSpeed) {
            setMaxSpeed(speedInUnit);
          }
        }

        // Calculate distance with improved accuracy
        if (lastLocation.current && coords) {
          const distance = calculateDistance(
            lastLocation.current.latitude,
            lastLocation.current.longitude,
            coords.latitude,
            coords.longitude
          );
          
          // Convert distance to meters and add if reasonable
          const distanceInMeters = distance * 1000; // Convert km to meters
          
          // Only add distance if it's reasonable (not GPS jump) and we have good accuracy
          if (distanceInMeters > 0 && distanceInMeters < 50 && currentAccuracy < 15) { // Max 50m per update
            setTotalDistance(prev => prev + distanceInMeters);
            console.log('Distance added:', distanceInMeters.toFixed(2), 'm, Total:', (totalDistance + distanceInMeters).toFixed(2), 'm');
          }
        }

        // Store location history for better calculations
        locationHistory.current.push({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: timestamp,
          accuracy: currentAccuracy
        });
        
        // Keep only last 20 locations
        if (locationHistory.current.length > 20) {
          locationHistory.current.shift();
        }

        lastLocation.current = { ...coords, timestamp };
        speedReadings.current.push(speedInUnit);

        // Update speed history for graph
        setSpeedHistory(prev => {
          const newHistory = [...prev, { speed: speedInUnit, time: Date.now() }];
          return newHistory.slice(-50); // Keep last 50 readings
        });

        // Calculate average speed (last 10 readings)
        if (speedReadings.current.length > 10) {
          speedReadings.current.shift();
        }
        const avg = speedReadings.current.reduce((a, b) => a + b, 0) / speedReadings.current.length;
        setAverageSpeed(avg);
        
        // Auto-reset if stuck at 0 for too long (more than 10 readings)
        if (speedReadings.current.length > 10) {
          const recentSpeeds = speedReadings.current.slice(-10);
          const allZero = recentSpeeds.every(speed => speed === 0);
          if (allZero) {
            console.log('Auto-resetting speed calculation - stuck at 0 for too long');
            speedReadings.current = [];
            lastLocation.current = null;
            setGpsStatus('Auto-reset: Clearing stuck speed data');
          }
        }
      },
      (error) => {
        console.log('Location error:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        setGpsStatus('GPS Error - Check Settings');
        Alert.alert('Location Error', `Error: ${error.message}\nCode: ${error.code}`);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0, // Update every movement (no filter)
        interval: 300, // Update every 300ms (faster updates)
        fastestInterval: 100, // Fastest update every 100ms
        maximumAge: 2000, // Accept cached locations up to 2 seconds old
      }
    );
    
    console.log('GPS watchPosition setup complete. Subscription ID:', locationSubscription.current);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setGpsStatus('GPS Stopped');
    if (locationSubscription.current) {
      Geolocation.clearWatch(locationSubscription.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (emulatorSimulationRef.current) {
      stopEmulatorSimulation();
    }
  };

  const resetTrip = () => {
    stopTracking();
    setCurrentSpeed(0);
    setMaxSpeed(0);
    setAverageSpeed(0);
    setTotalDistance(0);
    setElapsedTime(0);
    setTripStartTime(null);
    setSpeedHistory([]);
    setGpsStatus('Waiting for GPS...');
    speedReadings.current = [];
    locationHistory.current = [];
    lastLocation.current = null;
    lastSpeedUpdate.current = 0;
  };

  const toggleSpeedUnit = () => {
    setSpeedUnit(prev => prev === 'kmh' ? 'mph' : 'kmh');
  };

  const toggleDistanceUnit = () => {
    setDistanceUnit(prev => prev === 'km' ? 'miles' : 'km');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}min ${secs}s`;
    } else if (mins > 0) {
      return `${mins}min ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatSpeed = (speed) => {
    return speed.toFixed(1);
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${distance.toFixed(0)}m`;
    } else {
      return `${(distance / 1000).toFixed(2)}km`;
    }
  };

  const getSpeedColor = (speed) => {
    if (speed < 30) return '#4CAF50'; // Green
    if (speed < 60) return '#FF9800'; // Orange
    if (speed < 90) return '#FF5722'; // Red
    return '#9C27B0'; // Purple
  };

  const getAccuracyColor = (acc) => {
    if (acc < 5) return '#4CAF50'; // Excellent
    if (acc < 10) return '#FF9800'; // Good
    return '#FF5722'; // Poor
  };

  const getGpsStatusColor = () => {
    if (gpsStatus.includes('Excellent')) return '#4CAF50';
    if (gpsStatus.includes('Good')) return '#FF9800';
    if (gpsStatus.includes('Poor')) return '#FF5722';
    return '#b0b0b0';
  };

  const testSpeedSimulation = () => {
    console.log('Starting speed simulation test...');
    let testSpeed = 0;
    const speedInterval = setInterval(() => {
      testSpeed += 5;
      if (testSpeed > 50) testSpeed = 0;
      console.log('Simulated speed:', testSpeed);
      setCurrentSpeed(testSpeed);
      setGpsStatus('Speed Simulation Active');
    }, 1000);
    
    // Stop simulation after 10 seconds
    setTimeout(() => {
      clearInterval(speedInterval);
      setGpsStatus('Speed Simulation Complete');
    }, 10000);
  };

  const forceGPSUpdate = () => {
    console.log('Forcing GPS update...');
    setGpsStatus('Forcing GPS Update...');
    
    // Clear speed history to force fresh calculation
    speedReadings.current = [];
    lastLocation.current = null;
    
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('Forced GPS update:', position);
        const { speed, coords } = position;
        const accuracy = coords?.accuracy || 0;
        
        // Calculate speed manually
        let speedInUnit = calculateSpeedFromGPS(position);
        speedInUnit = smoothSpeed(speedInUnit);
        
        if (speedUnit === 'mph') {
          speedInUnit = speedInUnit * 0.621371;
        }
        
        setCurrentSpeed(speedInUnit);
        setAccuracy(accuracy);
        setGpsStatus(`Forced Update: ${speedInUnit.toFixed(1)} ${speedUnit.toUpperCase()}`);
        
        console.log('Forced speed update:', speedInUnit);
      },
      (error) => {
        console.log('Forced GPS update failed:', error);
        setGpsStatus('Forced Update Failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const resetSpeedCalculation = () => {
    console.log('Resetting speed calculation...');
    setGpsStatus('Resetting Speed Calculation...');
    
    // Clear all speed-related data
    speedReadings.current = [];
    lastLocation.current = null;
    lastSpeedUpdate.current = 0;
    
    // Force a fresh GPS reading
    setTimeout(() => {
      forceGPSUpdate();
    }, 1000);
  };

  const startEmulatorSimulation = () => {
    console.log('Starting emulator GPS simulation...');
    setIsEmulatorMode(true);
    setGpsStatus('Emulator Mode Active');
    
    // Start with a base location
    let currentLat = 33.72926666666667;
    let currentLon = 73.093135;
    let currentSpeed = 0;
    let isAccelerating = true;
    
    emulatorSimulationRef.current = setInterval(() => {
      // Simulate movement
      if (isAccelerating) {
        currentSpeed += 2;
        if (currentSpeed >= 60) {
          isAccelerating = false;
        }
      } else {
        currentSpeed -= 1;
        if (currentSpeed <= 5) {
          isAccelerating = true;
        }
      }
      
      // Simulate position change based on speed
      const speedInMps = currentSpeed / 3.6; // Convert km/h to m/s
      const distanceInDegrees = (speedInMps * 0.5) / 111000; // Rough conversion to degrees
      
      currentLat += distanceInDegrees * (Math.random() - 0.5) * 0.1;
      currentLon += distanceInDegrees * (Math.random() - 0.5) * 0.1;
      
      // Create fake GPS position
      const fakePosition = {
        coords: {
          latitude: currentLat,
          longitude: currentLon,
          accuracy: 3 + Math.random() * 2, // 3-5m accuracy
          altitude: 100 + Math.random() * 50,
          speed: speedInMps, // Speed in m/s
          heading: Math.random() * 360,
        },
        timestamp: Date.now(),
        extras: {
          satellites: 8 + Math.floor(Math.random() * 4), // 8-11 satellites
        }
      };
      
      console.log('Emulator GPS update:', fakePosition);
      
      // Process the fake GPS data
      const { coords, altitude, accuracy, timestamp } = fakePosition;
      
      setCurrentAltitude(altitude || 0);
      setAccuracy(accuracy || 0);
      
      // Calculate speed
      let speedInUnit = currentSpeed; // Already in km/h
      
      if (speedUnit === 'mph') {
        speedInUnit = speedInUnit * 0.621371;
      }
      
      setCurrentSpeed(speedInUnit);
      
      // Update max speed
      if (speedInUnit > maxSpeed) {
        setMaxSpeed(speedInUnit);
      }
      
      // Calculate distance
      if (lastLocation.current) {
        const distance = calculateDistance(
          lastLocation.current.latitude,
          lastLocation.current.longitude,
          coords.latitude,
          coords.longitude
        );
        
        // Convert distance to meters and add if reasonable
        const distanceInMeters = distance * 1000; // Convert km to meters
        
        if (distanceInMeters > 0 && distanceInMeters < 50) {
          setTotalDistance(prev => prev + distanceInMeters);
        }
      }
      
      // Store location history
      locationHistory.current.push({
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: timestamp,
        accuracy: accuracy
      });
      
      if (locationHistory.current.length > 20) {
        locationHistory.current.shift();
      }
      
      lastLocation.current = { ...coords, timestamp };
      speedReadings.current.push(speedInUnit);
      
      // Update speed history
      setSpeedHistory(prev => {
        const newHistory = [...prev, { speed: speedInUnit, time: Date.now() }];
        return newHistory.slice(-50);
      });
      
      // Calculate average speed
      if (speedReadings.current.length > 10) {
        speedReadings.current.shift();
      }
      const avg = speedReadings.current.reduce((a, b) => a + b, 0) / speedReadings.current.length;
      setAverageSpeed(avg);
      
    }, 1000); // Update every second
  };

  const stopEmulatorSimulation = () => {
    if (emulatorSimulationRef.current) {
      clearInterval(emulatorSimulationRef.current);
      emulatorSimulationRef.current = null;
    }
    setIsEmulatorMode(false);
    setGpsStatus('Emulator Mode Stopped');
  };

  const checkDeviceGPSSettings = () => {
    Alert.alert(
      'GPS Settings Check',
      'Please check these settings on your device:\n\n' +
      '1. Settings → Location → Turn ON\n' +
      '2. Settings → Location → Mode → High accuracy\n' +
      '3. Settings → Apps → GPS Speedometer → Permissions → Location → Allow\n' +
      '4. Make sure you\'re outdoors or near a window\n' +
      '5. Wait 30-60 seconds for GPS to get a fix\n\n' +
      'After checking these, try "Check GPS Status" again.',
      [
        { text: 'OK', style: 'default' },
        { text: 'Check GPS Status', onPress: checkGPSStatus }
      ]
    );
  };

  const renderSpeedGraph = () => {
    if (speedHistory.length < 2) return null;

    const maxSpeed = Math.max(...speedHistory.map(h => h.speed));
    const graphHeight = 100;
    const graphWidth = width - 40;

    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Speed History</Text>
        <View style={styles.graph}>
          {speedHistory.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = speedHistory[index - 1];
            const x1 = (index - 1) * (graphWidth / (speedHistory.length - 1));
            const y1 = graphHeight - (prevPoint.speed / maxSpeed) * graphHeight;
            const x2 = index * (graphWidth / (speedHistory.length - 1));
            const y2 = graphHeight - (point.speed / maxSpeed) * graphHeight;
            
            return (
              <View
                key={index}
                style={[
                  styles.graphLine,
                  {
                    left: x1,
                    top: y1,
                    width: x2 - x1,
                    height: 2,
                    backgroundColor: getSpeedColor(point.speed),
                  }
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={BG_GRADIENT} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#23253a" />
      {/* Add margin at the top to shift content down */}
      <View style={{ marginTop: 32 }}>
        {/* Speedometer Dial */}
        <SpeedometerDial speed={currentSpeed} maxSpeed={maxSpeed} />
        {/* m/s display */}
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: PRIMARY, fontSize: 44, fontWeight: 'bold', fontFamily: 'System' }}>{(currentSpeed / 3.6).toFixed(0)}</Text>
          <Text style={{ color: '#b0c4de', fontSize: 20, fontFamily: 'System' }}>m/s</Text>
          
          {/* Movement detection indicator */}
          {isTracking && currentSpeed === 0 && speedReadings.current.length > 5 && (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginTop: 4,
              backgroundColor: 'rgba(255, 165, 0, 0.2)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12
            }}>
              <View style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: '#FFA500',
                marginRight: 6
              }} />
              <Text style={{ color: '#FFA500', fontSize: 12, fontFamily: 'System' }}>
                Waiting for movement...
              </Text>
            </View>
          )}
        </View>
        {/* Info row with SVG icons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <InfoIcon type="distance" />
            <Text style={{ color: INFO_TEXT, fontSize: 20, marginLeft: 6, fontFamily: 'System' }}>{formatDistance(totalDistance)}</Text>
          </View>
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            <InfoIcon type="accuracy" />
            <Text style={{ color: INFO_TEXT, fontSize: 20, marginLeft: 6, fontFamily: 'System' }}>±{accuracy.toFixed(0)}m</Text>
          </View>
        </View>
        
        {/* Reset speed button - only show when speed is 0 and tracking is active */}
        {isTracking && currentSpeed === 0 && (
          <TouchableOpacity 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              alignSelf: 'center',
              marginTop: 8
            }}
            onPress={resetSpeedCalculation}
          >
            <Text style={{ color: PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'System' }}>
              Reset Speed Detection
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Ad banner placeholder */}
      <View style={{ position: 'absolute', bottom: 18, left: 18, right: 18, backgroundColor: AD_BG, borderRadius: 18, borderWidth: 2, borderColor: AD_BORDER, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ color: PRIMARY, fontSize: 18, fontFamily: 'System' }}>Ad Banner</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
  },
  gpsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gpsStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  gpsStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  accuracyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  accuracyText: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  speedContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  speedCircle: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  speedText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  speedUnit: {
    fontSize: 18,
    color: '#b0b0b0',
    marginTop: 5,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 2,
  },
  statsToggle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsToggleText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statUnit: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  unitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeUnitButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  unitButtonText: {
    color: '#b0b0b0',
    fontSize: 14,
    fontWeight: '600',
  },
  activeUnitButtonText: {
    color: '#ffffff',
  },
  graphContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  graphTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  graph: {
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    position: 'relative',
  },
  graphLine: {
    position: 'absolute',
    borderRadius: 1,
  },
  testContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  testButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App; 