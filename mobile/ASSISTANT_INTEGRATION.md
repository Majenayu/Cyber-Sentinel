# Mobile Integration Guide (Android Assistant)

To make Sunday Mac 47 act as your system assistant:

## 1. Intent Filter (AndroidManifest.xml)
Add this to your main activity in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.ASSIST" />
    <category android:name="android.intent.category.DEFAULT" />
</intent-filter>
```

## 2. Setting Default Assistant
After installing the app:
1. Go to **Settings** on your Android phone.
2. Search for **Default apps**.
3. Select **Digital assistant app**.
4. Choose **Sunday Mac 47** instead of Google.

## 3. Implementation (React Native)
Use `react-native-voice` to capture speech immediately when the app is opened via the assist intent.

```javascript
import Voice from '@react-native-voice/voice';

// In your App initialization
useEffect(() => {
  // Check if opened via assist intent
  // If so, start listening automatically
  Voice.start('en-US');
}, []);
```
