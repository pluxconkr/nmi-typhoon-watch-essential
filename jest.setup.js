// Gesture Handler, Reanimated and Worklets ship their own Jest setup and mocks; jest-expo does not include them.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
require('react-native-reanimated').setUpTests();
