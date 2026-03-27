import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import AIChatScreen from '../screens/AIChatScreen';
import AskAIScreen from '../screens/AskAIScreen';
import DMScreen from '../screens/DMScreen';
import MeScreen from '../screens/MeScreen';
import ResonanceScreen from '../screens/ResonanceScreen';
import TalkScreen from '../screens/TalkScreen';
import TermsScreen from '../screens/TermsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { C } from '../theme';

function IconMe({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4.5" stroke={color} strokeWidth="1.5" />
      <Path d="M4 21q0-7 8-7t8 7" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function IconTalk({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19Q4 5 12 5Q20 5 20 13Q20 19 12 19L4 19Z" stroke={color} strokeWidth="1.5" />
      <Circle cx="9" cy="12" r="1.2" fill={color} />
      <Circle cx="12" cy="12" r="1.2" fill={color} />
      <Circle cx="15" cy="12" r="1.2" fill={color} />
    </Svg>
  );
}

function IconDisc({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.5" />
      <Line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function TabIcon({ focused, SvgIcon, label }) {
  const color = focused ? C.p : C.tm;
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <SvgIcon color={color} />
      <Text style={{ fontSize: 10, color, fontWeight: focused ? '500' : '400', marginTop: 4 }}>
        {label}
      </Text>
      <View style={{
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: focused ? C.p : 'transparent',
        marginTop: 3,
      }} />
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.bd,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 0,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="わたし"
        component={MeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconMe} label="わたし" /> }}
      />
      <Tab.Screen
        name="トーク"
        component={TalkScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconTalk} label="トーク" /> }}
      />
      <Tab.Screen
        name="共鳴"
        component={ResonanceScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconDisc} label="共鳴" /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="AIChat"
          component={AIChatScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="DM"
          component={DMScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AskAI"
          component={AskAIScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
