module.exports = {
  dependencies: {
    '@react-native-firebase/app': {
      platforms: {
        ios: null,
        android: {
          packageImportPath: 'import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;',
          packageInstance: 'new ReactNativeFirebaseAppPackage()',
        },
      },
    },
    '@react-native-firebase/messaging': {
      platforms: { ios: null },
    },
  },
};
